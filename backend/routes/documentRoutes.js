const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const srsTemplate = require('../templates/srsTemplate');
const brdTemplate = require('../templates/brdTemplate');
const frsTemplate = require('../templates/frsTemplate');
const userStoryTemplate = require('../templates/userStoryTemplate');
const axios = require('axios');
const plantumlEncoder = require('plantuml-encoder');
const { extractTextFromFile } = require('../utils/fileExtractors');
// const { generateDocumentPrompt } = require('../utils/prompt.js');
const { generateDocumentPrompt, regenPrompt } = require('../utils/prompt.js');

function validateAndFixTemplateStructure(content, template, docType) {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content provided to validateAndFixTemplateStructure');
  }  
  if (!template || typeof template !== 'string') {
    throw new Error('Invalid template provided to validateAndFixTemplateStructure');
  }
  if (!docType || typeof docType !== 'string') {
    throw new Error('Invalid docType provided to validateAndFixTemplateStructure');
  }
  const templateSections = [];
  const sectionRegex = /^\s*##\s+(.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(template)) !== null) {
    templateSections.push(match[1].trim());
  }
  const headingRegex = /^(##\s+|\*\*|#\s*)([\w\d .\-()]+)(\*\*|)$/gm;
  const contentSections = [];
  let contentMatch;
  while ((contentMatch = headingRegex.exec(content)) !== null) {
    contentSections.push({
      heading: contentMatch[2].trim(),
      index: contentMatch.index
    });
  }
  function extractSectionContentFlexible(content, sectionName) {
    console.log(`[extractSectionContentFlexible] Looking for section: "${sectionName}"`);
    const sections = content.split(/\n\s*##\s+/);
    console.log(`[extractSectionContentFlexible] Found ${sections.length} sections`);
    for (let i = 1; i < sections.length; i++) { // Skip first section (title)
      const section = sections[i];
      const lines = section.split('\n');
      const heading = lines[0].trim();
      console.log(`[extractSectionContentFlexible] Checking section: "${heading}"`);
      
      if (heading === sectionName) {
        const content = lines.slice(1).join('\n').trim();
        console.log(`[extractSectionContentFlexible] FOUND! Content length: ${content.length}`);
        return content;
      }
    }    
    console.log(`[extractSectionContentFlexible] Section not found`);
    return null;
  }
  let fixedContent = `# ${docType === 'BRD' ? 'Business Requirements Document (BRD)' : 
                      docType === 'SRS' ? 'Software Requirements Specification (SRS)' :
                      docType === 'FRS' ? 'Functional Requirements Specification (FRS)' :
                      'User Stories'}\n\n`;
  console.log('[validateAndFixTemplateStructure] Reconstructing document to match template.');
  console.log('[validateAndFixTemplateStructure] Original content length:', content.length);
  console.log('[validateAndFixTemplateStructure] Original content preview:', content.substring(0, 300) + '...');
  
  templateSections.forEach((section, index) => {
    fixedContent += `## ${section}\n`;
    const sectionContent = extractSectionContentFlexible(content, section);
    console.log(`[validateAndFixTemplateStructure] Looking for section: "${section}"`);
    console.log(`[validateAndFixTemplateStructure] Found content length: ${sectionContent ? sectionContent.length : 0}`);
    if (sectionContent && sectionContent.length > 0 && sectionContent !== '- Not specified') {
      fixedContent += sectionContent + '\n\n';
      console.log(`[validateAndFixTemplateStructure] Section found: ${section}`);
    } else {
      fixedContent += '- Not specified\n\n';
      console.log(`[validateAndFixTemplateStructure] Section missing, inserting default: ${section}`);
    }
  });
  return fixedContent;
}

// Helper to parse a Markdown table into an array of objects
function parseMarkdownTable(md) {
  const lines = md.trim().split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
  const rows = lines.slice(2); // skip header and separator
  return rows.map(row => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  });
}

// Generate document (SRS, BRD, FRS, User Story) with diagrams and tables
router.post('/:id/generate', async (req, res) => {
  const { id } = req.params;
  const { docType } = req.body; // 'SRS', 'BRD', 'FRS', 'UserStory'
  let doc;
  try {
    doc = await Document.findById(id);
  } catch (err) {
    console.error('Invalid document id:', err);
    return res.status(400).json({ error: 'Invalid document id', details: err.message });
  }
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Select template based on docType
  let template;
  switch (docType) {
    case 'SRS': template = srsTemplate; break;
    case 'BRD': template = brdTemplate; break;
    case 'FRS': template = frsTemplate; break;
    case 'UserStory': template = userStoryTemplate; break;
    default: return res.status(400).json({ error: 'Invalid docType' });
  }
  let userInput = '';
  let extractedText = '';
  
  if (doc.inputType === 'text' && doc.text) {
    // Handle text-only input
    userInput = doc.text;
  } else if ((doc.inputType === 'document' || doc.inputType === 'image') && doc.filePath) {
    // Handle file input
    extractedText = await extractTextFromFile(doc.filePath, doc.inputType);
    if (extractedText && extractedText.trim().length > 0) {
      userInput = `Below is the full content of an uploaded ${doc.inputType} (file: ${doc.originalName}):\n\n${extractedText}\n\nPlease generate a complete ${docType} using the provided template. The document must include all template sections, and for sections requiring diagrams or tables, always include at least one PlantUML diagram (in a code block) and one Markdown table (in a code block), even if you have to invent or mock the content. Do not summarize or critique the content—produce a formal ${docType} document only.`;
    } else {
      userInput = `Below is the full content of an uploaded ${doc.inputType} (file: ${doc.originalName}). No extractable text was found. Please generate a complete ${docType} using the provided template. The document must include all template sections, and for sections requiring diagrams or tables, always include at least one PlantUML diagram (in a code block) and one Markdown table (in a code block), even if you have to invent or mock the content. Do not summarize or critique the content—produce a formal ${docType} document only.`;
    }
    // Add any additional text context if provided
    if (doc.text && doc.text.trim().length > 0) {
      userInput += `\n\nUser query: ${doc.text}`;
    }
  } else {
    return res.status(400).json({ error: 'Invalid document type or missing content' });
  }

const prompt = generateDocumentPrompt(docType, template, userInput);

  try {
    console.log('[DEBUG] Sending prompt to LLM service...');
    console.log('[DEBUG] Prompt length:', prompt.length);
    console.log('[DEBUG] Prompt preview:', prompt.substring(0, 200) + '...');
    
    const llmRes = await axios.post(
      'http://localhost:8000/generate-doc',
      { prompt },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('[DEBUG] LLM response received');
    console.log('[DEBUG] Response status:', llmRes.status);
    console.log('[DEBUG] Response data:', llmRes.data);
    
    // Check if LLM service returned an error
    if (llmRes.data.error) {
      throw new Error(`LLM service error: ${llmRes.data.error}`);
    }
    
    // Validate LLM response
    if (!llmRes.data || !llmRes.data.doc) {
      throw new Error('LLM service returned invalid response: No document content received');
    }
    
    let generatedContent = llmRes.data.doc;
    
    if (typeof generatedContent !== 'string' || generatedContent.trim().length === 0) {
      throw new Error('LLM service returned empty or invalid document content');
    }
    
    console.log('[DEBUG] Raw LLM content before validation:');
    console.log('=== START OF LLM CONTENT ===');
    console.log(generatedContent);
    console.log('=== END OF LLM CONTENT ===');

    generatedContent = validateAndFixTemplateStructure(generatedContent, template, docType);

    //  STEP 1: First, extract PlantUML code blocks BEFORE modifying content
    const plantUmlBlocks = [];
    const plantUmlRegex = /```plantuml([\s\S]*?)```/g;
    let match;
    while ((match = plantUmlRegex.exec(generatedContent)) !== null) {
      plantUmlBlocks.push(match[1].trim());
    }

    console.log(`[DEBUG] Found ${plantUmlBlocks.length} PlantUML diagrams`);

    // sTEP 2: Generate PlantUML image URLs and diagram info
const diagramUrls = plantUmlBlocks.map((code, index) => {
  try {
    const encoded = plantumlEncoder.encode(code.trim());
    // FIXED: Changed from HTTP to HTTPS
    const url = `https://www.plantuml.com/plantuml/png/${encoded}`;
    console.log(`[DEBUG] Generated diagram URL ${index + 1}:`, url);
    return {
      id: index,
      code: code,
      url: url,
      encodedUrl: encoded
    };
  } catch (err) {
    console.error(`[DEBUG] Error encoding PlantUML diagram ${index + 1}:`, err);
    return {
      id: index,
      code: code,
      url: null,
      error: err.message
    };
  }
});

//  STEP 3: Now replace PlantUML code blocks with image markdown
generatedContent = generatedContent.replace(/```plantuml([\s\S]*?)```/g, (match, code) => {
  try {
    const encoded = plantumlEncoder.encode(code.trim());

    return `![PlantUML Diagram](https://www.plantuml.com/plantuml/png/${encoded})`;
  } catch (e) {
    console.error('Failed to encode PlantUML block:', e);
    return match; 
  }
});

//  STEP 4: Add debugging to verify the transformation
console.log('[DEBUG] Content after PlantUML transformation:', generatedContent.substring(0, 500));
console.log('[DEBUG] Number of image markdown tags found:', (generatedContent.match(/!\[PlantUML Diagram\]/g) || []).length);


    // Extract Markdown tables (both in code blocks and regular markdown)
    const markdownTables = [];
    const parsedTables = [];
    
    // First, try to find tables in code blocks
    const codeBlockTableRegex = /```(?:markdown)?\s*\|[\s\S]*?\|[\s\S]*?```/g;
    let tableMatch;
    while ((tableMatch = codeBlockTableRegex.exec(generatedContent)) !== null) {
      const md = tableMatch[0].replace(/```(?:markdown)?/,'').replace(/```/,'').trim();
      markdownTables.push(md);
      parsedTables.push(parseMarkdownTable(md));
    }
    
    // Then, find regular markdown tables (not in code blocks)
    const regularTableRegex = /(?<!```)[\|][\s\S]*?[\|][\s\S]*?[\|](?!```)/g;
    while ((tableMatch = regularTableRegex.exec(generatedContent)) !== null) {
      const md = tableMatch[0].trim();
      // Check if this table is already captured (avoid duplicates)
      if (!markdownTables.includes(md)) {
        markdownTables.push(md);
        parsedTables.push(parseMarkdownTable(md));
      }
    }
    
    console.log(`[DEBUG] Found ${markdownTables.length} tables in the document`);
    console.log(`[DEBUG] Document now contains ${diagramUrls.length} diagrams as images`);

    // Store everything in document
    doc.docType = docType;
    doc.generatedContent = generatedContent; // This now has image links instead of code blocks
    doc.parsedTables = parsedTables;
    doc.diagramUrls = diagramUrls; // Store diagram URLs and code
    doc.plantUmlBlocks = plantUmlBlocks; // Store raw PlantUML code
    await doc.save();

    console.log(`[DEBUG] Document saved with ${diagramUrls.length} diagrams and ${parsedTables.length} tables`);

    res.json({ 
      success: true,
      generatedContent,  // Contains image markdown links
      parsedTables, 
      diagrams: diagramUrls, // Array of diagram objects with URLs and code
      plantUmlBlocks: plantUmlBlocks, // Raw PlantUML code
      diagramCount: plantUmlBlocks.length,
      tableCount: parsedTables.length,
      document: doc 
    });
    
  } catch (err) {
    console.error('Error in document generation:', err);
    
    // Check if it's an LLM service error
    if (err.code === 'ECONNREFUSED' || err.message.includes('connect')) {
      return res.status(503).json({ 
        error: 'LLM service unavailable', 
        details: 'Please ensure the Python LLM service is running on port 8000',
        solution: 'Run: python start_llm_service.py'
      });
    }
    
    // Check if it's an API key error
    if (err.response && err.response.data && err.response.data.error) {
      return res.status(500).json({ 
        error: 'LLM service error', 
        details: err.response.data.error 
      });
    }
    
    // Check if it's a validation error
    if (err.message.includes('Invalid content') || err.message.includes('LLM service returned')) {
      return res.status(500).json({ 
        error: 'Document generation failed', 
        details: err.message,
        solution: 'Check LLM service configuration and API keys'
      });
    }
    
    res.status(500).json({ error: 'LLM service error', details: err.message });
  }
});


router.post('/:id/regenerate', async (req, res) => {
  const { id } = req.params;
  let doc;
  
  try {
    doc = await Document.findById(id);
  } catch (err) {
    console.error('Invalid document id:', err);
    return res.status(400).json({ error: 'Invalid document id', details: err.message });
  }
  
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  
  if (!doc.generatedContent || !doc.docType) {
    return res.status(400).json({ 
      error: 'Document must be generated first before regeneration',
      details: 'Use the generate endpoint first to create initial document content'
    });
  }

  // Get the existing docType and template
  const docType = doc.docType;
  let template;
  switch (docType) {
    case 'SRS': template = srsTemplate; break;
    case 'BRD': template = brdTemplate; break;
    case 'FRS': template = frsTemplate; break;
    case 'UserStory': template = userStoryTemplate; break;
    default: return res.status(400).json({ error: 'Invalid docType in existing document' });
  }

  // Reconstruct original user input
  let userInput = '';
  let extractedText = '';
  
  if (doc.inputType === 'text' && doc.text) {
    // Handle text-only input
    userInput = doc.text;
  } else if ((doc.inputType === 'document' || doc.inputType === 'image') && doc.filePath) {
    // Handle file input
    extractedText = await extractTextFromFile(doc.filePath, doc.inputType);
    if (extractedText && extractedText.trim().length > 0) {
      userInput = `Below is the full content of an uploaded ${doc.inputType} (file: ${doc.originalName}):\n\n${extractedText}\n\nPlease regenerate a complete ${docType} using the provided template with DIFFERENT content and approach. The document must include all template sections, and for sections requiring diagrams or tables, always include at least one PlantUML diagram (in a code block) and one Markdown table (in a code block), but make them DIFFERENT from the previous version. Do not summarize or critique the content—produce a formal ${docType} document only with alternative perspectives and examples.`;
    } else {
      userInput = `Below is the full content of an uploaded ${doc.inputType} (file: ${doc.originalName}). No extractable text was found. Please regenerate a complete ${docType} using the provided template with DIFFERENT content and approach. The document must include all template sections, and for sections requiring diagrams or tables, always include at least one PlantUML diagram (in a code block) and one Markdown table (in a code block), but make them DIFFERENT from the previous version. Do not summarize or critique the content—produce a formal ${docType} document only with alternative perspectives and examples.`;
    }
    // Add any additional text context if provided
    if (doc.text && doc.text.trim().length > 0) {
      userInput += `\n\nUser query: ${doc.text}`;
    }
  } else {
    return res.status(400).json({ error: 'Invalid document type or missing content' });
  }

  // Use the regeneration prompt with previous content for variation
  const prompt = regenPrompt(docType, template, userInput, doc.generatedContent);

  try {
    console.log('[DEBUG] Sending regeneration prompt to LLM service...');
    console.log('[DEBUG] Regeneration prompt length:', prompt.length);
    console.log('[DEBUG] Document type:', docType);
    console.log('[DEBUG] Previous content length:', doc.generatedContent?.length || 0);
    
    const llmRes = await axios.post(
      'http://localhost:8000/generate-doc',
      { prompt },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('[DEBUG] LLM regeneration response received');
    console.log('[DEBUG] Response status:', llmRes.status);
    
    // Check if LLM service returned an error
    if (llmRes.data.error) {
      throw new Error(`LLM service error: ${llmRes.data.error}`);
    }
    
    // Validate LLM response
    if (!llmRes.data || !llmRes.data.doc) {
      throw new Error('LLM service returned invalid response: No document content received');
    }
    
    let generatedContent = llmRes.data.doc;
    
    if (typeof generatedContent !== 'string' || generatedContent.trim().length === 0) {
      throw new Error('LLM service returned empty or invalid document content');
    }
    
    console.log('[DEBUG] Raw LLM regeneration content before validation:');
    console.log('=== START OF REGENERATED LLM CONTENT ===');
    console.log(generatedContent.substring(0, 500) + '...');
    console.log('=== END OF REGENERATED LLM CONTENT PREVIEW ===');

    generatedContent = validateAndFixTemplateStructure(generatedContent, template, docType);

    // *** PRESERVE EXISTING DIAGRAMS - Extract new PlantUML blocks but keep existing URLs ***
    const newPlantUmlBlocks = [];
    const plantUmlRegex = /```plantuml([\s\S]*?)```/g;
    let match;
    while ((match = plantUmlRegex.exec(generatedContent)) !== null) {
      newPlantUmlBlocks.push(match[1].trim());
    }

    console.log(`[DEBUG] Found ${newPlantUmlBlocks.length} new PlantUML diagrams in regenerated content`);
    console.log(`[DEBUG] Existing diagrams: ${doc.diagramUrls?.length || 0}`);

    // Use existing diagram URLs if available, otherwise generate new ones
    const diagramUrls = [];
    const plantUmlBlocks = [];

    if (doc.diagramUrls && doc.diagramUrls.length > 0) {
      // Keep existing diagrams
      console.log('[DEBUG] Preserving existing diagrams from previous generation');
      doc.diagramUrls.forEach((existingDiagram, index) => {
        diagramUrls.push({
          id: index,
          code: existingDiagram.code || doc.plantUmlBlocks[index] || '',
          url: existingDiagram.url,
          encodedUrl: existingDiagram.encodedUrl
        });
        plantUmlBlocks.push(existingDiagram.code || doc.plantUmlBlocks[index] || '');
      });
      
      // Replace PlantUML code blocks with existing image URLs
      let diagramIndex = 0;
      generatedContent = generatedContent.replace(/```plantuml([\s\S]*?)```/g, (match, code) => {
        if (diagramIndex < diagramUrls.length) {
          const existingUrl = diagramUrls[diagramIndex].url;
          diagramIndex++;
          console.log(`[DEBUG] Replacing PlantUML block ${diagramIndex} with existing URL: ${existingUrl}`);
          return `![PlantUML Diagram](${existingUrl})`;
        } else {
          // If we have more new diagrams than existing ones, generate new URL
          try {
            const encoded = plantumlEncoder.encode(code.trim());
            const url = `https://www.plantuml.com/plantuml/png/${encoded}`;
            diagramUrls.push({
              id: diagramUrls.length,
              code: code.trim(),
              url: url,
              encodedUrl: encoded
            });
            plantUmlBlocks.push(code.trim());
            console.log(`[DEBUG] Generated new diagram URL for extra diagram: ${url}`);
            return `![PlantUML Diagram](${url})`;
          } catch (e) {
            console.error('Failed to encode new PlantUML block:', e);
            return match;
          }
        }
      });
    } else {
      // No existing diagrams, generate new ones (fallback)
      console.log('[DEBUG] No existing diagrams found, generating new ones');
      newPlantUmlBlocks.forEach((code, index) => {
        try {
          const encoded = plantumlEncoder.encode(code.trim());
          const url = `https://www.plantuml.com/plantuml/png/${encoded}`;
          diagramUrls.push({
            id: index,
            code: code,
            url: url,
            encodedUrl: encoded
          });
          plantUmlBlocks.push(code);
        } catch (err) {
          console.error(`[DEBUG] Error encoding new PlantUML diagram ${index + 1}:`, err);
          diagramUrls.push({
            id: index,
            code: code,
            url: null,
            error: err.message
          });
          plantUmlBlocks.push(code);
        }
      });
      
      // Replace PlantUML code blocks with image markdown
      generatedContent = generatedContent.replace(/```plantuml([\s\S]*?)```/g, (match, code) => {
        try {
          const encoded = plantumlEncoder.encode(code.trim());
          return `![PlantUML Diagram](https://www.plantuml.com/plantuml/png/${encoded})`;
        } catch (e) {
          console.error('Failed to encode PlantUML block:', e);
          return match; 
        }
      });
    }

    console.log('[DEBUG] Regenerated content after PlantUML transformation:', generatedContent.substring(0, 500));
    console.log(`[DEBUG] Final diagram count: ${diagramUrls.length}, preserved: ${doc.diagramUrls?.length || 0}`);

    // Extract Markdown tables (both in code blocks and regular markdown)
    const markdownTables = [];
    const parsedTables = [];
    
    // Find tables in code blocks
    const codeBlockTableRegex = /```(?:markdown)?\s*\|[\s\S]*?\|[\s\S]*?```/g;
    let tableMatch;
    while ((tableMatch = codeBlockTableRegex.exec(generatedContent)) !== null) {
      const md = tableMatch[0].replace(/```(?:markdown)?/,'').replace(/```/,'').trim();
      markdownTables.push(md);
      parsedTables.push(parseMarkdownTable(md));
    }
    
    // Find regular markdown tables (not in code blocks)
    const regularTableRegex = /(?<!```)[\|][\s\S]*?[\|][\s\S]*?[\|](?!```)/g;
    while ((tableMatch = regularTableRegex.exec(generatedContent)) !== null) {
      const md = tableMatch[0].trim();
      if (!markdownTables.includes(md)) {
        markdownTables.push(md);
        parsedTables.push(parseMarkdownTable(md));
      }
    }
    
    console.log(`[DEBUG] Found ${markdownTables.length} tables in the regenerated document`);

    // Store the previous version in history (optional - you can implement version history)
    const previousVersion = {
      content: doc.generatedContent,
      generatedAt: doc.updatedAt,
      version: doc.version || 1
    };

    // Update document with regenerated content
    doc.generatedContent = generatedContent;
    doc.parsedTables = parsedTables;
    doc.diagramUrls = diagramUrls; // This now preserves existing diagrams
    doc.plantUmlBlocks = plantUmlBlocks; // This now preserves existing PlantUML code
    doc.version = (doc.version || 1) + 1; // Increment version
    doc.regeneratedAt = new Date(); // Track regeneration time
    
    await doc.save();

    console.log(`[DEBUG] Document regenerated and saved with ${diagramUrls.length} diagrams and ${parsedTables.length} tables`);
    console.log(`[DEBUG] New version: ${doc.version}`);
    console.log(`[DEBUG] Diagrams preserved from previous version`);

    res.json({ 
      success: true,
      message: 'Document successfully regenerated with new content (diagrams preserved)',
      generatedContent,
      parsedTables, 
      diagrams: diagramUrls,
      plantUmlBlocks: plantUmlBlocks,
      diagramCount: plantUmlBlocks.length,
      tableCount: parsedTables.length,
      version: doc.version,
      regeneratedAt: doc.regeneratedAt,
      diagramsPreserved: doc.diagramUrls?.length || 0,
      document: doc 
    });
    
  } catch (err) {
    console.error('Error in document regeneration:', err);
    
    // Check if it's an LLM service error
    if (err.code === 'ECONNREFUSED' || err.message.includes('connect')) {
      return res.status(503).json({ 
        error: 'LLM service unavailable', 
        details: 'Please ensure the Python LLM service is running on port 8000',
        solution: 'Run: python start_llm_service.py'
      });
    }
    
    // Check if it's an API key error
    if (err.response && err.response.data && err.response.data.error) {
      return res.status(500).json({ 
        error: 'LLM service error', 
        details: err.response.data.error 
      });
    }
    
    // Check if it's a validation error
    if (err.message.includes('Invalid content') || err.message.includes('LLM service returned')) {
      return res.status(500).json({ 
        error: 'Document regeneration failed', 
        details: err.message,
        solution: 'Check LLM service configuration and API keys'
      });
    }
    
    res.status(500).json({ error: 'Document regeneration failed', details: err.message });
  }
});

router.get('/:id/versions', async (req, res) => {
  const { id } = req.params;
  
  try {
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    const versionInfo = {
      currentVersion: doc.version || 1,
      generatedAt: doc.createdAt,
      regeneratedAt: doc.regeneratedAt || null,
      docType: doc.docType,
      hasContent: !!doc.generatedContent,
      contentLength: doc.generatedContent?.length || 0,
      diagramCount: doc.plantUmlBlocks?.length || 0,
      tableCount: doc.parsedTables?.length || 0
    };
    
    res.json(versionInfo);
  } catch (err) {
    console.error('Error fetching version info:', err);
    res.status(500).json({ error: 'Failed to fetch version information', details: err.message });
  }
});

module.exports = router;