const userStoriesTemplate = `
# User Stories Template

## Epic Title:
Enter the name of the epic or module this set of user stories belongs to (e.g., "User Authentication", "Product Checkout").

---

## User Story [US-XX]

- **User Role:**  
  Identify the user type or persona performing the action (e.g., "As a customer", "As an admin").

- **Goal / Action:**  
  Specify what the user wants to do (e.g., "I want to reset my password").

- **Business Value / Benefit:**  
  Explain why the user wants this (e.g., "So that I can regain access to my account").

- **Full User Story Format:**  
  \`As a [user role], I want to [perform action], so that [achieve benefit].\`

### Acceptance Criteria (Given–When–Then format)

- Given [starting condition], when [action is performed], then [expected result]
- [Additional testable rule or constraint]
- [Error or exception handling, if applicable]

### Additional Metadata

- **Priority:** High / Medium / Low  
- **Story Points:** Numeric value for effort estimation (e.g., 1, 3, 5, 8)  
- **Dependencies:** Other stories, modules, or systems this depends on  
- **Tags / Labels:** Optional (e.g., frontend, backend, security)

---

(Repeat the "User Story" section for each additional user story)

`;

module.exports = userStoriesTemplate;
