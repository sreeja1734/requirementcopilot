/**
 * Generates the document generation prompt for LLM service
 * @param {string} docType - Document type (SRS, BRD, FRS, UserStory)
 * @param {string} template - Document template structure
 * @param {string} userInput - User input content
 * @returns {string} Complete prompt for LLM service
 */
function generateDocumentPrompt(docType, template, userInput) {
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
- For EVERY significant functionality mentioned in the document, generate a detailed use case as a the last section .
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
-Make the plantUML image vertical instead of horizontal 

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

  return prompt;
}

/**
 * Generates the document regeneration prompt for LLM service
 * This prompt encourages variation while maintaining structure
 * @param {string} docType - Document type (SRS, BRD, FRS, UserStory)
 * @param {string} template - Document template structure
 * @param {string} userInput - User input content
 * @param {string} previousContent - Previously generated content for reference
 * @returns {string} Complete regeneration prompt for LLM service
 */
function regenPrompt(docType, template, userInput, previousContent) {
  const prompt = `
You are an expert requirements engineer tasked with REGENERATING a comprehensive ${docType} document with detailed use cases.

REGENERATION INSTRUCTIONS:
- This is a REGENERATION request - create a NEW version with DIFFERENT content while maintaining the same structure
- Use ALTERNATIVE approaches, different examples, varied terminology, and fresh perspectives
- Generate DIFFERENT use cases, tables, and diagrams compared to the previous version
- Maintain the same quality and completeness but with VARIED content
- Use different business scenarios, user roles, or technical approaches where applicable

PREVIOUS VERSION REFERENCE (for variation purposes only - DO NOT copy):
${previousContent.substring(0, 1000)}...

CRITICAL INSTRUCTIONS:
1. You MUST use the EXACT template structure provided below
2. You MUST include ALL section headings in the EXACT order shown in the template
3. You MUST NOT add, remove, or modify any section titles
4. You MUST NOT create your own document structure
5. You MUST follow the template format precisely
6. CREATE DIFFERENT CONTENT than the previous version while maintaining structure

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

USE CASE GENERATION REQUIREMENTS FOR REGENERATION:
- Generate COMPLETELY DIFFERENT use cases than the previous version
- For EVERY significant functionality mentioned in the document, create NEW detailed use cases
- Each use case MUST include proper HTML table formatting
- Generate AT LEAST 5-10 DIFFERENT use cases based on the document content
- Use ALTERNATIVE user roles, scenarios, and workflows

REGENERATION-SPECIFIC USE CASE EXAMPLES:
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
<td>System Authentication</td>
<td>System User</td>
<td>Critical</td>
</tr>
<tr>
<td>UC-02</td>
<td>Data Management</td>
<td>Administrator</td>
<td>High</td>
</tr>
<tr>
<td>UC-03</td>
<td>Report Generation</td>
<td>Manager</td>
<td>Medium</td>
</tr>
</tbody>
</table>

ALTERNATIVE VERSION HISTORY EXAMPLE:
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
<td>2.0</td>
<td>2024-10-27</td>
<td>Senior Business Analyst</td>
<td>Regenerated document with enhanced requirements</td>
</tr>
</tbody>
</table>

ALTERNATIVE REQUIREMENTS TABLE EXAMPLE:
<table>
<thead>
<tr>
<th>Req ID</th>
<th>Requirement</th>
<th>Category</th>
<th>Priority</th>
</tr>
</thead>
<tbody>
<tr>
<td>REQ-01</td>
<td>System integration capabilities</td>
<td>Functional</td>
<td>Critical</td>
</tr>
<tr>
<td>REQ-02</td>
<td>User interface responsiveness</td>
<td>Performance</td>
<td>High</td>
</tr>
<tr>
<td>REQ-03</td>
<td>Data backup procedures</td>
<td>Security</td>
<td>High</td>
</tr>
</tbody>
</table>

PLANTUML DIAGRAM REQUIREMENTS FOR REGENERATION:
- Create DIFFERENT diagrams than the previous version
- Use alternative PlantUML diagram types and layouts
- Include different actors, processes, or system components
- Make the plantUML image vertical instead of horizontal

ALTERNATIVE USE CASE DIAGRAM EXAMPLE:
\`\`\`plantuml
@startuml
!theme plain
left to right direction

actor "System Admin" as SA
actor "Business User" as BU
actor "Guest User" as GU

SA --> (System Configuration)
SA --> (User Management)
SA --> (Security Settings)

BU --> (Data Entry)
BU --> (Report Viewing)
BU --> (Process Workflow)

GU --> (Public Information)
GU --> (Registration)

(System Configuration) .> (Database Setup) : include
(User Management) .> (Role Assignment) : include
@enduml
\`\`\`

ALTERNATIVE SYSTEM FLOW DIAGRAM EXAMPLE:
\`\`\`plantuml
@startuml
!theme plain
start
:Initialize System;
:Load Configuration;
if (System Ready?) then (yes)
  :Accept User Requests;
  :Process Business Logic;
  :Generate Response;
  :Log Transaction;
else (no)
  :Display Error;
  :Initiate Recovery;
endif
:Complete Operation;
stop
@enduml
\`\`\`

DOCUMENT-SPECIFIC REGENERATION GUIDELINES:
- **BRD**: Focus on different business processes, alternative stakeholder perspectives
- **SRS**: Emphasize different system features, alternative technical requirements
- **FRS**: Detail different functional approaches, alternative API specifications
- **User Stories**: Create different user personas, alternative user journeys

REGENERATION REMINDERS:
1. NEVER use markdown table syntax with pipes (|) and dashes (-)
2. ALWAYS use HTML table tags (<table>, <thead>, <tbody>, <tr>, <th>, <td>)
3. Each HTML table must be complete with proper opening and closing tags
4. Include proper table headers using <th> tags
5. Use <tbody> for table body content
6. For sections requiring tables, include at least one DIFFERENT HTML table
7. For sections requiring diagrams, include at least one DIFFERENT PlantUML diagram
8. If a section has no content, write "Not specified" under that section heading
9. Do NOT summarize or critique the input - produce ONLY the formal document
10. Generate ALTERNATIVE comprehensive use cases with different perspectives

TEMPLATE TO FOLLOW EXACTLY:
${template}

USER INPUT TO PROCESS:
${userInput}

Remember: Create a REGENERATED version with DIFFERENT content while maintaining the exact template structure. Use HTML tables ONLY - no markdown tables with pipes and dashes. Generate alternative use cases, different examples, and varied approaches that reflect the actual functionality described in the uploaded document but with fresh perspectives.
`;

  return prompt;
}

module.exports = {
  generateDocumentPrompt,
  regenPrompt
};