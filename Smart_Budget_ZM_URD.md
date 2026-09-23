# User Requirements Document (URD)

## Smart Budget ZM

**Document Type:** User Requirements Document  
**Project Title:** Smart Budget ZM  
**Student:** Khadijah Zimba  
**Supervisor:** Mr A. Theu  
**Department:** Computer Science  
**Version:** 1.0  
**Date:** 28 August 2026  
**Status:** Draft

---

# 1. Introduction

## 1.1 Purpose of the Document

This User Requirements Document (URD) defines the user-oriented requirements for **Smart Budget ZM**, a mobile budgeting and personal financial management application designed specifically for the Zambian market.

The document translates the project proposal into clear, testable requirements that can guide system design, development, testing, deployment, and evaluation.

The system is intended to help users track their financial transactions, understand spending patterns, plan savings, set financial goals, and receive personalized financial insights. It will support integration with local mobile money services such as **Airtel Money** and **MTN Mobile Money**, subject to the availability and permitted use of their APIs.

## 1.2 Background

Mobile money services are widely used in Zambia, but many users still manage their personal finances manually or do not systematically track their spending. Smart Budget ZM is proposed as a localized budgeting solution that combines transaction tracking, spending categorization, savings prediction, financial goals, analytics, and intelligent financial guidance.

The application will provide users with an interactive dashboard where they can monitor their financial behavior and receive insights based on their transaction history.

## 1.3 Problem Statement

Many users of mobile money services in Zambia have limited access to intelligent budgeting tools. Existing financial applications commonly provide transaction and account-management functionality but may provide limited support for budgeting, savings planning, spending analysis, and personalized financial guidance.

As a result, users may have difficulty identifying unnecessary spending, monitoring their budgets, planning savings, and understanding changes in their financial behavior over time.

Smart Budget ZM seeks to address this gap through a localized mobile application that combines financial tracking with analytics and intelligent budgeting features.

## 1.4 Project Aim

The aim of Smart Budget ZM is to develop a mobile budgeting application that integrates with local mobile money services and provides intelligent financial management tools to promote financial literacy, improve budgeting practices, and encourage savings among Zambian users.

---

# 2. Stakeholders and User Roles

The system shall support the following primary stakeholders and user roles.

| User Role | Main Responsibilities |
|---|---|
| **Registered User** | Create and manage an account, connect supported financial services, view transactions, manage budgets, set financial goals, monitor savings, and receive financial insights. |
| **Administrator** | Manage users, monitor system activity, configure system settings, manage categories and supported services, and review system-level information. |
| **Mobile Money/Service Provider** | Provide authorized transaction information through supported integration mechanisms where available. |
| **System/ML Component** | Analyze transaction and spending data, categorize transactions, identify trends, and generate savings predictions and financial insights. |

---

# 3. User Requirements

## 3.1 Account and Authentication Requirements

### UR-001: User Registration

The system shall allow a new user to create a personal account.

The registration process shall collect the minimum information required to identify and authenticate the user.

### UR-002: User Login

The system shall allow registered users to securely log into their accounts.

### UR-003: Secure Authentication

The system shall protect user accounts using secure authentication mechanisms.

### UR-004: Password Management

The system shall allow users to securely change or reset their passwords.

### UR-005: User Logout

The system shall allow users to securely log out of the application.

---

## 3.2 User Profile Requirements

### UR-006: Manage Personal Profile

The system shall allow users to create, view, and update their personal profile.

### UR-007: Financial Preferences

The system shall allow users to configure relevant financial preferences, including budgeting and savings preferences.

### UR-008: Financial History

The system shall maintain the user's authorized financial history so that it can be used for transaction analysis and reporting.

---

## 3.3 Mobile Money Integration Requirements

### UR-009: Connect Mobile Money Services

The system shall allow users to connect supported mobile money services, including Airtel Money and MTN Mobile Money, where supported integration APIs are available.

### UR-010: Transaction Retrieval

The system shall retrieve authorized transaction information from supported mobile money services.

### UR-011: Transaction Synchronization

The system shall synchronize newly available transactions without requiring users to manually enter every transaction.

### UR-012: Integration Failure Handling

The system shall inform users when a connected mobile money service cannot be accessed or synchronized.

### UR-013: Manual Transaction Entry

Where automatic transaction retrieval is unavailable, the system should allow users to manually record transactions.

---

## 3.4 Transaction Management Requirements

### UR-014: View Transactions

The system shall allow users to view their recorded financial transactions.

### UR-015: Transaction Details

Each transaction should contain relevant information such as:

- Transaction date and time
- Amount
- Transaction type
- Description/reference
- Source or account
- Spending category

### UR-016: Transaction Search and Filtering

The system shall allow users to search and filter transactions by relevant attributes such as date, category, transaction type, and amount.

### UR-017: Transaction History

The system shall maintain a historical record of transactions for financial analysis.

---

## 3.5 Spending Categorization Requirements

### UR-018: Automatic Categorization

The system shall automatically categorize transactions into appropriate spending groups.

Possible categories shall include:

- Food
- Transport
- Utilities
- Entertainment
- Shopping
- Education
- Healthcare
- Housing
- Communication
- Savings
- Other

### UR-019: Manual Categorization

The system shall allow users to change or assign a category to a transaction when the automatic category is incorrect.

### UR-020: Category Management

The system should allow administrators to configure the standard transaction categories.

### UR-021: Categorization Improvement

The system should use historical transaction information to improve the accuracy of transaction categorization where machine learning is implemented.

---

## 3.6 Budget Management Requirements

### UR-022: Create Budget

The system shall allow users to create personal budgets.

### UR-023: Budget Categories

Users shall be able to assign budget limits to individual spending categories.

### UR-024: Monitor Budget

The system shall show users how much of their allocated budget has been spent and how much remains.

### UR-025: Budget Alerts

The system should notify users when their spending approaches or exceeds a configured budget limit.

### UR-026: Adjust Budget

The system shall allow users to modify or update their personal budgets.

---

## 3.7 Savings Management Requirements

### UR-027: Set Savings Goal

The system shall allow users to create personal savings goals.

A savings goal may include:

- Goal name
- Target amount
- Current saved amount
- Target date
- Savings frequency

### UR-028: Monitor Savings Progress

The system shall display progress toward each savings goal.

### UR-029: Savings Prediction

The system shall use available historical spending and savings information to estimate future monthly savings trends.

### UR-030: Savings Insights

The system shall provide users with insights that can help them understand whether their current financial behavior is likely to meet their savings goals.

---

## 3.8 Financial Analytics Requirements

### UR-031: Spending Summary

The system shall provide summaries of user spending over selected periods.

### UR-032: Monthly Comparison

The system shall allow users to compare spending patterns across multiple months.

### UR-033: Spending Trends

The system shall identify and display significant changes in spending behavior over time.

### UR-034: Category Analysis

The system shall show how much the user spends in each major category.

### UR-035: Financial Dashboard

The system shall provide an interactive dashboard showing relevant financial information, including:

- Total income or inflows
- Total spending
- Remaining budget
- Savings progress
- Major spending categories
- Spending trends
- Savings predictions
- Financial insights

---

## 3.9 Intelligent Financial Advice Requirements

### UR-036: Personalized Financial Tips

The system shall generate financial tips based on the user's spending and savings behavior.

### UR-037: Spending Recommendations

The system should identify potentially unnecessary or unusually high spending patterns and provide appropriate budgeting suggestions.

### UR-038: Savings Recommendations

The system should provide suggestions that may help users improve their savings behavior.

### UR-039: Advice Transparency

The system shall clearly communicate that automated financial recommendations are informational and should not be treated as guaranteed professional financial advice.

### UR-040: Fairness and Bias

The intelligent recommendation component shall be designed to reduce unfair or discriminatory recommendations and should use relevant user financial information rather than inappropriate personal characteristics.

---

## 3.10 Notifications Requirements

### UR-041: Budget Notifications

The system should notify users when they approach or exceed budget limits.

### UR-042: Savings Notifications

The system should provide reminders or updates related to savings goals.

### UR-043: Financial Insight Notifications

The system may notify users when significant changes in spending patterns are identified.

### UR-044: Integration Notifications

The system shall inform users when transaction synchronization succeeds, fails, or requires attention.

---

## 3.11 Administrator Requirements

### UR-045: Administrator Authentication

The system shall provide secure authentication for administrators.

### UR-046: User Management

Administrators shall be able to view, manage, activate, deactivate, or otherwise administer user accounts according to their permissions.

### UR-047: System Activity Monitoring

Administrators shall be able to monitor relevant system activity.

### UR-048: Category Configuration

Administrators shall be able to manage standard transaction categories.

### UR-049: System Configuration

Administrators shall be able to configure appropriate application settings.

### UR-050: Audit Information

The system shall maintain records of significant administrative and security-related actions.

---

# 4. Non-Functional Requirements

## 4.1 Security

### NFR-001: Data Protection

The system shall protect financial and personal information against unauthorized access, modification, disclosure, or loss.

### NFR-002: Encryption

Sensitive data transmitted between the mobile application and backend services shall be encrypted using secure transport protocols.

### NFR-003: Password Security

Passwords shall not be stored in plain text and shall be protected using an appropriate secure password-hashing mechanism.

### NFR-004: Access Control

The system shall implement role-based access control so that users can only access functions and information permitted by their role.

### NFR-005: Session Security

The system shall securely manage authenticated sessions and prevent unauthorized access after logout or session expiration.

### NFR-006: Auditability

Important administrative, authentication, and financial-data operations shall be logged for security and accountability purposes.

---

## 4.2 Privacy and Data Protection

### NFR-007: User Consent

The system shall obtain appropriate user consent before collecting and processing personal and financial information.

### NFR-008: Data Minimization

The system shall collect only the information required to provide its services.

### NFR-009: Data Protection Compliance

The system shall be designed to comply with applicable Zambian data protection requirements, including the **Data Protection Act, 2021**.

### NFR-010: Third-Party Data Access

The application shall only access financial information from external services through authorized integration mechanisms and appropriate user permissions.

---

## 4.3 Usability

### NFR-011: Mobile-Friendly Interface

The application shall provide a simple and intuitive mobile interface suitable for users with different levels of technical and financial literacy.

### NFR-012: Navigation

Core functions such as transactions, budgets, savings goals, and dashboard analytics shall be accessible through clear navigation.

### NFR-013: Readability

Financial information shall be displayed in a clear and understandable format.

### NFR-014: Error Messages

The system shall provide clear messages when user actions fail or when required information is missing.

---

## 4.4 Performance

### NFR-015: Application Responsiveness

Normal application screens should load within an acceptable time under normal network conditions.

### NFR-016: Analytics Processing

Transaction analytics and summaries should be generated within a reasonable time for normal user transaction volumes.

### NFR-017: Synchronization

Transaction synchronization should complete within a reasonable period after a supported external service becomes available.

---

## 4.5 Reliability and Availability

### NFR-018: Reliability

The system should maintain consistent financial records and avoid loss or duplication of transactions.

### NFR-019: Error Recovery

The application shall handle temporary network and external-service failures without corrupting user data.

### NFR-020: Backup

Financial data shall be backed up using an appropriate backup strategy.

---

## 4.6 Scalability

### NFR-021: User Growth

The backend architecture should support an increasing number of users and transactions without requiring a complete redesign.

### NFR-022: Service Integration

The architecture should allow additional financial service providers to be integrated in future versions.

---

# 5. System Scope

## 5.1 In Scope

The following capabilities are included in the initial project:

- Android-first mobile application
- User registration and authentication
- User profile management
- Mobile money transaction tracking
- Airtel Money integration, subject to API availability and authorization
- MTN Mobile Money integration, subject to API availability and authorization
- Automatic transaction categorization
- Manual transaction categorization
- Budget creation and monitoring
- Savings goals
- Savings progress tracking
- Savings prediction
- Monthly spending comparisons
- Spending analytics
- Interactive financial dashboard
- Personalized financial tips
- Notifications
- Administrator control panel
- Secure storage and processing of financial information

## 5.2 Out of Scope

The following capabilities are outside the initial project scope:

- Direct loan issuance
- Investment trading
- Cryptocurrency functionality
- Banking services
- Acting as a bank or mobile money provider
- Direct management of user funds
- Automated investment transactions

Cryptocurrency support may be considered in a future Phase 2.

---

# 6. Proposed System Architecture and Technology

The proposal identifies the following technologies for implementation.

| Component | Proposed Technology |
|---|---|
| **Mobile Frontend** | Flutter |
| **Backend/API** | Node.js and/or Django |
| **Database** | Firebase or PostgreSQL |
| **AI/Prediction** | Python, TensorFlow and/or scikit-learn |
| **Hosting** | AWS or Google Cloud |
| **Mobile Money Integration** | Airtel Money and MTN Mobile Money APIs |
| **Development Environment** | Android Studio |
| **API Testing** | Postman |
| **Version Control** | GitHub |

> **Implementation note:** The final backend framework and database should be selected during system design. Using both Node.js and Django as the primary backend frameworks simultaneously would introduce unnecessary architectural complexity unless they serve clearly separated services.

---

# 7. Data Requirements

The system is expected to manage the following categories of data.

## 7.1 User Data

- User identifier
- Name
- Contact information
- Authentication credentials
- Financial preferences
- Account status

## 7.2 Transaction Data

- Transaction identifier
- User identifier
- Transaction date/time
- Amount
- Transaction type
- Description/reference
- Source
- Category

## 7.3 Budget Data

- Budget identifier
- User identifier
- Category
- Budget amount
- Amount spent
- Remaining amount
- Budget period

## 7.4 Savings Goal Data

- Goal identifier
- User identifier
- Goal name
- Target amount
- Current amount
- Target date
- Goal status

## 7.5 Analytics Data

The system may generate derived information including:

- Spending totals
- Category percentages
- Monthly spending trends
- Savings trends
- Budget utilization
- Savings predictions
- Personalized financial insights

---

# 8. Machine Learning and Prediction Requirements

## 8.1 Spending Analysis

The system shall analyze historical transaction information to identify spending patterns.

## 8.2 Savings Prediction

The system shall use historical financial behavior to estimate future savings trends.

## 8.3 Model Evaluation

Machine learning models shall be evaluated using appropriate performance measures before being incorporated into the application.

## 8.4 Minimum Data Requirement

The system should account for situations where a user has insufficient historical transaction data to produce a reliable prediction.

## 8.5 Prediction Limitations

Predictions shall be presented as estimates rather than guaranteed future financial outcomes.

---

# 9. Integration Requirements

## 9.1 Airtel Money Integration

The system shall support integration with Airtel Money where an appropriate authorized API or integration mechanism is available.

## 9.2 MTN Mobile Money Integration

The system shall support integration with MTN Mobile Money where an appropriate authorized API or integration mechanism is available.

## 9.3 External Service Failure

If an external mobile money service is unavailable, the system shall:

1. Preserve previously synchronized transaction data.
2. Inform the user of the synchronization problem.
3. Retry synchronization where appropriate.
4. Avoid creating duplicate transactions after synchronization resumes.

## 9.4 API Security

External service credentials and API keys shall not be stored insecurely in the mobile application.

---

# 10. Ethical and Legal Requirements

### ELR-001: Data Protection

The project shall follow applicable requirements of Zambia's Data Protection Act (2021).

### ELR-002: User Consent

Users shall be informed about the collection and processing of their financial information and provide appropriate consent.

### ELR-003: Financial Advice Disclaimer

The application shall clearly communicate the limitations of automated financial recommendations.

### ELR-004: Fairness

The system shall be designed to minimize unfair or biased financial recommendations.

### ELR-005: Regulatory Compliance

The project team shall assess applicable financial and mobile-money regulations before production deployment and obtain any required approvals, licenses, or permissions.

### ELR-006: Intellectual Property

All software libraries, APIs, datasets, models, and third-party services used by the project shall comply with their applicable licenses and terms of use.

---

# 11. User Stories and Acceptance Criteria

## US-001: Register an Account

**As a** new user,  
**I want** to create an account,  
**so that** I can securely use Smart Budget ZM.

**Acceptance Criteria:**

- User can provide required registration information.
- System validates the information.
- System creates the account when valid information is supplied.
- User can subsequently log in.

## US-002: View Transactions

**As a** registered user,  
**I want** to view my transactions,  
**so that** I can understand where my money is going.

**Acceptance Criteria:**

- User can open transaction history.
- Transactions display amount, date, description, and category.
- User can filter transactions.
- Only the user's authorized transactions are displayed.

## US-003: Set a Budget

**As a** user,  
**I want** to set spending limits,  
**so that** I can control my expenses.

**Acceptance Criteria:**

- User can create a budget.
- User can select a category.
- User can specify a budget amount and period.
- System displays spending against the budget.

## US-004: Set a Savings Goal

**As a** user,  
**I want** to create a savings goal,  
**so that** I can monitor progress toward a financial target.

**Acceptance Criteria:**

- User can define a target amount.
- User can specify a target date.
- System displays current progress.
- System provides relevant savings insights.

## US-005: Receive Financial Insights

**As a** user,  
**I want** personalized financial insights,  
**so that** I can make better budgeting decisions.

**Acceptance Criteria:**

- System analyzes available transaction history.
- System identifies relevant spending patterns.
- System provides understandable recommendations.
- Recommendations are clearly presented as informational guidance.

## US-006: Manage Users

**As an** administrator,  
**I want** to manage user accounts,  
**so that** I can maintain the integrity of the system.

**Acceptance Criteria:**

- Administrator can securely access the administration area.
- Administrator can view user accounts.
- Administrator can manage account status.
- Administrative actions are logged.

---

# 12. Assumptions

The project is based on the following assumptions:

1. Users have access to an Android-compatible smartphone.
2. Users have sufficient network connectivity to use cloud-based functionality.
3. Airtel Money and MTN Mobile Money provide an authorized integration mechanism suitable for the project.
4. Users provide the required consent for access to their financial information.
5. Sufficient transaction data may become available for spending analysis and prediction.
6. The application will initially focus on the Zambian market.
7. Financial predictions are estimates and depend on the quality and quantity of available historical data.
8. Any regulatory approvals required for production use will be assessed separately from the academic prototype.

---

# 13. Constraints

The project may be constrained by:

- Availability and access requirements of Airtel Money APIs.
- Availability and access requirements of MTN Mobile Money APIs.
- Internet connectivity.
- Limited access to realistic financial transaction datasets.
- Privacy restrictions surrounding financial data.
- Limited project development time.
- Costs associated with cloud hosting and third-party services.
- Regulatory requirements governing financial and mobile-money services.
- Machine learning accuracy depending on available historical data.

---

# 14. Project Timeline

| Phase | Duration |
|---|---:|
| Requirements Gathering | 2 weeks |
| Design | 3 weeks |
| Development | 10 weeks |
| Testing | 2 weeks |
| Deployment | 3 weeks |

### Key Milestones

- **Month 1:** Complete requirements and system design.
- **Months 2–3:** Development and initial testing.
- **Month 4:** Final testing, deployment, and evaluation.

---

# 15. Risk Analysis

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Data security breach | High | Implement encryption, secure authentication, access control, and security testing. |
| Mobile money API integration problems | High | Work with authorized provider APIs, isolate integrations behind service interfaces, and provide manual transaction entry as a fallback. |
| Insufficient transaction data for ML | High | Use suitable datasets for development/testing and provide a fallback for users with insufficient personal history. |
| Inaccurate savings predictions | Medium | Evaluate models, communicate prediction limitations, and avoid presenting predictions as guarantees. |
| User adoption challenges | Medium | Focus on simple UX/UI, localized terminology, user feedback, and usability testing. |
| Poor internet connectivity | Medium | Cache appropriate information locally and handle synchronization failures gracefully. |
| Regulatory changes | Medium | Monitor applicable regulations and consult appropriate authorities before production deployment. |
| Project time constraints | Medium | Prioritize core functionality and use iterative Agile development. |
| Third-party service downtime | Medium | Preserve synchronized data, retry failed operations, and notify users when integrations are unavailable. |

---

# 16. Expected Outcomes

Smart Budget ZM is expected to produce the following outcomes:

## 16.1 Improved Financial Literacy

Users should gain a clearer understanding of their spending behavior and budgeting practices.

## 16.2 Improved Savings Habits

Users should be encouraged to establish and monitor savings goals.

## 16.3 Better Financial Management

Users should be able to use transaction history, budgets, analytics, and financial insights to make more informed financial decisions.

## 16.4 Localized Financial Technology

The project should demonstrate how a budgeting solution can be designed around the needs of users in the Zambian context.

## 16.5 Intelligent Financial Insights

The system should demonstrate the use of machine learning and analytics to identify spending patterns and estimate savings trends.

---

# 17. Key Performance Indicators

The project may be evaluated using the following KPIs:

- User adoption rate
- User registration completion rate
- Monthly active users
- Transaction synchronization success rate
- Transaction categorization accuracy
- Savings prediction performance
- Budget usage and monitoring activity
- Savings-goal completion rate
- User engagement with financial insights
- User satisfaction
- Application response time
- System availability

---

# 18. Acceptance of the System

The Smart Budget ZM system shall be considered ready for academic evaluation when:

1. Users can register and securely authenticate.
2. Users can manage their profiles.
3. Transactions can be recorded and displayed.
4. Supported mobile money integrations can retrieve authorized transactions where available.
5. Transactions can be categorized.
6. Users can create and monitor budgets.
7. Users can create and monitor savings goals.
8. The dashboard displays meaningful financial analytics.
9. The system can generate savings trend predictions using the implemented model.
10. Personalized financial insights can be generated from available user data.
11. Administrators can manage users and relevant system settings.
12. Security and privacy requirements have been tested.
13. The application handles network and integration failures appropriately.
14. The system has undergone unit, integration, and user acceptance testing.

---

# 19. References

- Bank of Zambia. (2022). *Mobile Payments Statistics*.
- FSDZ. (2021). *Financial Inclusion in Zambia Report*.
- FNB Zambia. (2022). *Digital Banking Services*.
- Suri, T., & Jack, W. (2016). *The Economics of M-Pesa*. MIT Press.
- Kyeyune, A., & Pettersson, T. (2018). *Mobile Money and Financial Inclusion in Uganda*. Journal of African Economies.
- Republic of Zambia. (2021). *Data Protection Act, 2021*.

---

# 20. Document Version History

| Version | Date | Description | Author |
|---|---|---|---|
| 1.0 | 28 August 2026 | Initial URD based on the Smart Budget ZM project proposal | Khadijah Zimba |

---

# END OF DOCUMENT
