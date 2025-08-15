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
  // Validate input parameters
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content provided to validateAndFixTemplateStructure');
  }
  
  if (!template || typeof template !== 'string') {
    throw new Error('Invalid template provided to validateAndFixTemplateStructure');
  }
  
  if (!docType || typeof docType !== 'string') {
    throw new Error('Invalid docType provided to validateAndFixTemplateStructure');
  }

  // Extract section headings from template (tolerate leading spaces before ##)
  const templateSections = [];
  const sectionRegex = /^\s*##\s+(.+)$/gm;
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
    
    // Try a much simpler approach - just split by sections (tolerate leading spaces before ##)
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

// Enhanced prompt with use case generation
// Enhanced prompt that generates HTML tables instead of markdown tables
const prompt = `
You are an expert requirements engineer tasked with generating a comprehensive ${docType} document with detailed use cases.

CRITICAL INSTRUCTIONS:
1. You MUST use the EXACT template structure provided below
2. You MUST include ALL section headings in the EXACT order shown in the template
3. You MUST NOT add, remove, or modify any section titles
4. You MUST NOT create your own document structure
5. You MUST follow the template format precisely

TABLE FORMATTING RULES - VERY IMPORTANT:
- DO NOT use markdown tables with pipes (|) and dashes
- ALWAYS use HTML tables with proper <table>, <tr>, <th>, <td> tags
- HTML tables will render as proper formatted tables
- Each table MUST be standalone with proper HTML structure

CORRECT HTML TABLE FORMAT (ALWAYS USE THIS):
<table>
<thead>
<tr>
<th>Column 1</th>
<th>Column 2</th>
<th>Column 3</th>
</tr>
</thead>
<tbody>
<tr>
<td>Value 1</td>
<td>Value 2</td>
<td>Value 3</td>
</tr>
<tr>
<td>Value 4</td>
<td>Value 5</td>
<td>Value 6</td>
</tr>
</tbody>
</table>

DO NOT USE MARKDOWN TABLES (FORBIDDEN):
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |

USE CASE GENERATION REQUIREMENTS:
- For EVERY significant functionality mentioned in the document, generate a detailed use case
- Each use case MUST include proper HTML table formatting
- Generate AT LEAST 5-10 use cases based on the document content

USE CASE SUMMARY HTML TABLE EXAMPLE:
<table>
<thead>
<tr>
<th>Use Case ID</th>
<th>Use Case Name</th>
<th>Primary Actor</th>
<th>Priority</th>
</tr>
</thead>
<tbody>
<tr>
<td>UC-01</td>
<td>User Login</td>
<td>End User</td>
<td>High</td>
</tr>
<tr>
<td>UC-02</td>
<td>Create Task</td>
<td>End User</td>
<td>High</td>
</tr>
<tr>
<td>UC-03</td>
<td>Edit Task</td>
<td>End User</td>
<td>Medium</td>
</tr>
</tbody>
</table>

VERSION HISTORY HTML TABLE EXAMPLE:
<table>
<thead>
<tr>
<th>Version</th>
<th>Date</th>
<th>Author</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>1.0</td>
<td>2024-10-27</td>
<td>Requirements Engineer</td>
<td>Initial draft</td>
</tr>
</tbody>
</table>

BUSINESS REQUIREMENTS HTML TABLE EXAMPLE:
<table>
<thead>
<tr>
<th>ID</th>
<th>Description</th>
<th>Priority</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td>BR-01</td>
<td>Add new tasks</td>
<td>High</td>
<td>Active</td>
</tr>
<tr>
<td>BR-02</td>
<td>Edit existing tasks</td>
<td>High</td>
<td>Active</td>
</tr>
<tr>
<td>BR-03</td>
<td>Mark tasks as complete</td>
<td>High</td>
<td>Active</td>
</tr>
</tbody>
</table>

PLANTUML DIAGRAM REQUIREMENTS:
- Include use case diagrams using PlantUML
- Include system flow diagrams
- Include process flow diagrams where applicable

USE CASE DIAGRAM EXAMPLE:
\`\`\`plantuml
@startuml
actor User
actor Admin

User --> (Login)
User --> (Create Task)
User --> (Edit Task)
User --> (Delete Task)
User --> (Mark Complete)

Admin --> (Manage Users)
Admin --> (System Configuration)

(Login) .> (Validate Credentials) : include
(Create Task) .> (Save to Database) : include
@enduml
\`\`\`

SYSTEM FLOW DIAGRAM EXAMPLE:
\`\`\`plantuml
@startuml
start
:User Action;
:System Processing;
if (Valid Input?) then (yes)
  :Execute Function;
  :Update Database;
  :Return Success;
else (no)
  :Show Error Message;
endif
:End Process;
stop
@enduml
\`\`\`

DOCUMENT-SPECIFIC USE CASE GUIDELINES:
- **BRD**: Focus on business process use cases, stakeholder interactions
- **SRS**: Focus on system functionality use cases, user interactions with software
- **FRS**: Focus on detailed functional use cases, API interactions, data processing
- **User Stories**: Convert each user story into detailed use cases with acceptance criteria

IMPORTANT REMINDERS:
1. NEVER use markdown table syntax with pipes (|) and dashes (-)
2. ALWAYS use HTML table tags (<table>, <thead>, <tbody>, <tr>, <th>, <td>)
3. Each HTML table must be complete with proper opening and closing tags
4. Include proper table headers using <th> tags
5. Use <tbody> for table body content
6. For sections requiring tables, include at least one HTML table
7. For sections requiring diagrams, include at least one PlantUML diagram in a code block
8. If a section has no content, write "Not specified" under that section heading
9. Do NOT summarize or critique the input - produce ONLY the formal document
10. Generate comprehensive use cases based on the document content and context

TEMPLATE TO FOLLOW EXACTLY:
${template}

USER INPUT TO PROCESS:
${userInput}

Remember: Your output must match the template structure exactly, with all sections in the same order and format as shown in the template above. Use HTML tables ONLY - no markdown tables with pipes and dashes. Generate detailed use cases that reflect the actual functionality described in the uploaded document.
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
    
    // Additional validation for generated content
    if (typeof generatedContent !== 'string' || generatedContent.trim().length === 0) {
      throw new Error('LLM service returned empty or invalid document content');
    }
    
    console.log('[DEBUG] Raw LLM content before validation:');
    console.log('=== START OF LLM CONTENT ===');
    console.log(generatedContent);
    console.log('=== END OF LLM CONTENT ===');

    // Validate and fix template structure if needed
    generatedContent = validateAndFixTemplateStructure(generatedContent, template, docType);

    // ✅ STEP 1: First, extract PlantUML code blocks BEFORE modifying content
    const plantUmlBlocks = [];
    const plantUmlRegex = /```plantuml([\s\S]*?)```/g;
    let match;
    while ((match = plantUmlRegex.exec(generatedContent)) !== null) {
      plantUmlBlocks.push(match[1].trim());
    }

    console.log(`[DEBUG] Found ${plantUmlBlocks.length} PlantUML diagrams`);

    // ✅ STEP 2: Generate PlantUML image URLs and diagram info
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

// ✅ STEP 3: Now replace PlantUML code blocks with image markdown
generatedContent = generatedContent.replace(/```plantuml([\s\S]*?)```/g, (match, code) => {
  try {
    const encoded = plantumlEncoder.encode(code.trim());
    // FIXED: Changed from HTTP to HTTPS
    return `![PlantUML Diagram](https://www.plantuml.com/plantuml/png/${encoded})`;
  } catch (e) {
    console.error('Failed to encode PlantUML block:', e);
    return match; // fall back to original code block if encoding fails
  }
});

// ✅ STEP 4: Add debugging to verify the transformation
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


module.exports = router;