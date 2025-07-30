const frsTemplate = `
# Functional Requirements Specification (FRS)

## 1. Document Control
- Document Title: Functional Requirements Specification
- Version: 1.0
- Author: Your Name
- Date: YYYY-MM-DD
- Reviewed by: Reviewer Name
- Approved by: Approver Name

## 2. Project Overview
- Project Name: Project ABC
- Project Description: A short summary of the project’s purpose and scope
- Stakeholders:
  - Project Owner: Name
  - Sponsor: Name
  - Development Lead: Name
  - QA Lead: Name

## 3. Purpose
This document outlines the functional requirements of the XYZ application to ensure alignment between stakeholders and the development team.

## 4. Scope
- In Scope:
  - List of features, modules, or functionalities that are part of this project
- Out of Scope:
  - Features or areas that are intentionally excluded

## 5. Assumptions and Constraints
- Assumptions:
  - Users will have stable internet access
  - All user roles are predefined
- Constraints:
  - System must be responsive on mobile and desktop
  - Must comply with GDPR regulations

## 6. Definitions and Acronyms
- API: Application Programming Interface
- UI: User Interface
- DB: Database
- SSO: Single Sign-On

## 7. Functional Requirements
- FR-01
  - Description: The system allows users to register using their email and password
  - Priority: High
  - Acceptance Criteria: User receives a confirmation email after successful registration
- FR-02
  - Description: The system supports role-based access control
  - Priority: High
  - Acceptance Criteria: Admin users can view all registered users

## 8. Non-Functional Requirements
- NFR-01
  - Description: Homepage should load within 2 seconds under normal load
  - Type: Performance
- NFR-02
  - Description: Application should maintain 99.9% uptime
  - Type: Availability

## 9. Use Case Diagrams / Flows (Optional)
Include user interaction flows, diagrams, or swimlanes as needed to clarify user journeys or process logic.

## 10. Dependencies
- API Service: Required to handle login and authentication
- Payment Gateway: Needed for checkout flow
- External Identity Provider: Used for SSO

---

Please fill in the placeholders with actual project-specific data before use.
`;

module.exports = frsTemplate;
