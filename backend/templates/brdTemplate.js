const brdTemplate = `
# Business Requirements Document (BRD)

## 1. Document Control
- Version History
- Document Status
- Authors & Reviewers
- Approval Table

## 2. Executive Summary
- Brief overview of the business need
- Purpose of the project or solution

## 3. Business Objectives
- High-level business goals
- Key performance indicators (KPIs)

## 4. Project Scope
- In-Scope: What will be included
- Out-of-Scope: What is excluded

## 5. Business Requirements
- Enumerated list of business needs
  - Each with:
    - ID (e.g., BR-01)
    - Description
    - Priority (High/Medium/Low)

## 6. Stakeholder Identification
- List of all stakeholders
  - Role
  - Department
  - Contact Info
  - Level of involvement (e.g., decision maker, end-user)

## 7. Current State Analysis (As-Is)
- Overview of current processes
- Pain points or inefficiencies

## 8. Proposed Solution (To-Be)
- Description of the new solution or improvements
- How it aligns with business goals

## 9. Business Process Flows
- Diagrams/Flowcharts (e.g., BPMN or swimlane diagrams)
- Before and after scenarios

## 10. Assumptions, Dependencies & Constraints
- Assumptions made during requirements gathering
- External dependencies (e.g., 3rd party systems)
- Constraints (e.g., budget, timeline, regulatory)

## 11. Risks & Mitigation Plans
- Identified risks
- Probability/Impact
- Mitigation strategies

## 12. Success Criteria
- How success will be measured
- Acceptance criteria

## 13. Glossary of Terms
- Definitions of acronyms and business terms used

## 14. Appendices
- Supporting materials
- Links to related documents or data

## 15. Sign-off Section
- Stakeholder approvals
  - Name
  - Role
  - Date
  - Signature

---

Please fill in each section based on the provided input (text, meetings, interviews, or analysis).
`;

module.exports = brdTemplate;
