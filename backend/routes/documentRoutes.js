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

// Helper to validate and fix template structure
function validateAndFixTemplateStructure(content, template, docType) {
  // Extract section headings from template
  const templateSections = [];
  const sectionRegex = /^##\s+(.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(template)) !== null) {
    templateSections.push(match[1].trim());
  }

  // Extract all possible heading styles from content (## Section, **Section**, # Section)
  const headingRegex = /^(##\s+|\*\*|#\s*)([\w\d .\-()]+)(\*\*|)$/gm;
  const contentSections = [];
  let contentMatch;
  while ((contentMatch = headingRegex.exec(content)) !== null) {
    contentSections.push({
      heading: contentMatch[2].trim(),
      index: contentMatch.index
    });
  }

  // Helper to extract content for a specific section (by heading)
  function extractSectionContentFlexible(content, sectionName) {
    console.log(`[extractSectionContentFlexible] Looking for section: "${sectionName}"`);
    
    // Try a much simpler approach - just split by sections
    const sections = content.split(/\n## /);
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

  // Always reconstruct the output to match the template
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
  const doc = await Document.findById(id);
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

  const prompt = `
You are an expert requirements engineer tasked with generating a ${docType} document.

CRITICAL INSTRUCTIONS:
1. You MUST use the EXACT template structure provided below
2. You MUST include ALL section headings in the EXACT order shown in the template
3. You MUST NOT add, remove, or modify any section titles
4. You MUST NOT create your own document structure
5. You MUST follow the template format precisely
6. For sections requiring tables, include at least one Markdown table in a code block
7. For sections requiring diagrams, include at least one PlantUML diagram in a code block
8. If a section has no content, write "Not specified" under that section heading
9. Do NOT summarize or critique the input - produce ONLY the formal document

TEMPLATE TO FOLLOW EXACTLY:
${template}

USER INPUT TO PROCESS:
${userInput}

Remember: Your output must match the template structure exactly, with all sections in the same order and format as shown in the template above.
`;

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
    console.log('[DEBUG] Response length:', llmRes.data.doc ? llmRes.data.doc.length : 0);
    console.log('[DEBUG] Response preview:', llmRes.data.doc ? llmRes.data.doc.substring(0, 200) + '...' : 'No response');
    
    let generatedContent = llmRes.data.doc;
    
    console.log('[DEBUG] Raw LLM content before validation:');
    console.log('=== START OF LLM CONTENT ===');
    console.log(generatedContent);
    console.log('=== END OF LLM CONTENT ===');

    // Validate and fix template structure if needed
    generatedContent = validateAndFixTemplateStructure(generatedContent, template, docType);

    // Extract PlantUML code blocks
    const plantUmlBlocks = [];
    const plantUmlRegex = /```plantuml([\s\S]*?)```/g;
    let match;
    while ((match = plantUmlRegex.exec(generatedContent)) !== null) {
      plantUmlBlocks.push(match[1].trim());
    } 

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
    const regularTableRegex = /(?<!```)\|[\s\S]*?\|[\s\S]*?\|(?!```)/g;
    while ((tableMatch = regularTableRegex.exec(generatedContent)) !== null) {
      const md = tableMatch[0].trim();
      // Check if this table is already captured (avoid duplicates)
      if (!markdownTables.includes(md)) {
        markdownTables.push(md);
        parsedTables.push(parseMarkdownTable(md));
      }
    }
    
    console.log(`[DEBUG] Found ${markdownTables.length} tables in the document`);
    markdownTables.forEach((table, index) => {
      console.log(`[DEBUG] Table ${index + 1}:`, table.substring(0, 100) + '...');
    });

    // Generate PlantUML image URLs
    const diagramUrls = plantUmlBlocks.map(code => {
      const encoded = plantumlEncoder.encode(code);
      return `http://www.plantuml.com/plantuml/png/${encoded}`;
    });

    doc.docType = docType;
    doc.generatedContent = generatedContent;
    doc.diagrams = diagramUrls;
    doc.tables = markdownTables;
    doc.parsedTables = parsedTables;
    await doc.save();

    res.json({ 
      generatedContent, 
      diagrams: diagramUrls, 
      tables: markdownTables, 
      parsedTables, 
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
    
    res.status(500).json({ error: 'LLM service error', details: err.message });
  }
});


module.exports = router;