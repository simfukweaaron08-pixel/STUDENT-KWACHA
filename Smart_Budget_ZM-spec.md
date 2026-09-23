# Smart Budget ZM — System Specification

**Based on:** `Smart_Budget_ZM_URD.md` (v1.0)
**Date:** 28 August 2026
**Status:** Draft — awaiting implementation

---

## 1. Executive Summary

Smart Budget ZM is a full-stack mobile budgeting application for the Zambian market. It allows users to track financial transactions (including mobile money), set budgets, create savings goals, receive personalized financial insights, and view analytics. An Android-first Flutter app connects to a Node.js/Express backend, with a separate Python ML microservice for transaction categorization and savings predictions. A React-based web admin dashboard provides system management. The database is PostgreSQL, deployed self-hosted.

---

## 2. Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Mobile App** | Flutter (Android-only) | URD requirement; Dart SDK, single codebase |
| **Backend API** | Node.js + Express | User preference; REST API over JSON |
| **Database** | PostgreSQL | User preference; relational data, complex analytics queries |
| **ML Service** | Python + FastAPI | Separate microservice; scikit-learn for predictions |
| **Admin Dashboard** | React + Vite | Web-based admin panel |
| **Auth** | JWT (access + refresh tokens) | Stateless, standard for Node.js APIs |
| **Notifications** | Push (Firebase Cloud Messaging) + Email | User preference |
| **Offline Storage** | Hive (Flutter local DB) | Full offline support on device |
| **Currency** | Zambian Kwacha (ZK / ZMW) | Primary currency throughout |

### 2.1 Project Structure (Monorepo)

```
smart-budget-zm/
├── apps/
│   ├── flutter-app/        # Flutter mobile app
│   ├── backend-api/        # Node.js Express API
│   ├── ml-service/         # Python FastAPI ML microservice
│   └── admin-dashboard/    # React admin web dashboard
├── shared/
│   └── types/              # Shared type definitions (JSON schemas)
├── docker/
│   └── docker-compose.yml  # Orchestration for all services
├── scripts/
│   └── seed.ts             # Database seeding script
├── .github/                # CI/CD workflows
├── docs/                   # Documentation
├── package.json            # Root package.json (monorepo tooling)
└── README.md
```

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
users ──< transactions
users ──< budgets
users ──< savings_goals
users ──< mobile_money_accounts
users ──< notifications
transactions ──< transaction_categories (via category FK)
categories ──< budgets (via category FK)
admin_users ──< audit_logs
```

### 3.2 Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | VARCHAR(255) UNIQUE NOT NULL | Login identifier |
| phone_number | VARCHAR(20) UNIQUE | Optional, for mobile money linking |
| full_name | VARCHAR(255) NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | bcrypt hashed |
| currency | VARCHAR(3) DEFAULT 'ZMW' | Primary currency |
| profile_image_url | TEXT | Optional avatar |
| status | ENUM('active','inactive','suspended') DEFAULT 'active' | Account status |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

#### `admin_users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | Links to regular user |
| role | ENUM('admin','super_admin') | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| token | TEXT NOT NULL | Hashed refresh token |
| expires_at | TIMESTAMP NOT NULL | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| revoked_at | TIMESTAMP NULL | |

#### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR(100) UNIQUE NOT NULL | e.g., Food, Transport |
| icon | VARCHAR(50) | Material icon name |
| color | VARCHAR(7) | Hex color code |
| is_system | BOOLEAN DEFAULT TRUE | System vs. user-created |
| created_by | UUID (FK → users.id) NULL | NULL = system default |
| created_at | TIMESTAMP DEFAULT NOW() | |

**Default categories:** Food, Transport, Utilities, Entertainment, Shopping, Education, Healthcare, Housing, Communication, Savings, Other

#### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| amount | DECIMAL(12,2) NOT NULL | Amount in ZK |
| type | ENUM('income','expense','transfer') NOT NULL | |
| description | TEXT | User or system-provided description |
| category_id | UUID (FK → categories.id) | Auto or manual assigned |
| category_source | ENUM('auto','manual') DEFAULT 'auto' | How category was assigned |
| source | VARCHAR(100) | e.g., 'airtel_money', 'mtn_momo', 'manual' |
| reference_number | VARCHAR(100) | External reference ID |
| transaction_date | TIMESTAMP NOT NULL | When the transaction occurred |
| synced_at | TIMESTAMP NULL | When synced from mobile money |
| is_recurring | BOOLEAN DEFAULT FALSE | |
| tags | TEXT[] | Optional user tags |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

**Index:** Composite index on (user_id, transaction_date, category_id)

#### `budgets`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| category_id | UUID (FK → categories.id) | NULL = overall budget |
| amount | DECIMAL(12,2) NOT NULL | Budget limit in ZK |
| period | ENUM('weekly','monthly','quarterly','yearly') DEFAULT 'monthly' | |
| start_date | DATE NOT NULL | |
| end_date | DATE NULL | NULL = ongoing |
| is_active | BOOLEAN DEFAULT TRUE | |
| alert_threshold | DECIMAL(5,2) DEFAULT 80.00 | Percentage at which to alert |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

**Computed:** `spent_amount` is calculated at query time by summing matching transactions in the period.

#### `savings_goals`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| name | VARCHAR(255) NOT NULL | Goal name, e.g., "Emergency Fund" |
| target_amount | DECIMAL(12,2) NOT NULL | |
| current_amount | DECIMAL(12,2) DEFAULT 0.00 | |
| target_date | DATE NOT NULL | |
| frequency | ENUM('daily','weekly','biweekly','monthly') | Expected savings frequency |
| status | ENUM('active','completed','paused','cancelled') DEFAULT 'active' | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

#### `savings_entries`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| savings_goal_id | UUID (FK → savings_goals.id) | |
| amount | DECIMAL(12,2) NOT NULL | Amount saved in this entry |
| entry_date | DATE NOT NULL | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `mobile_money_accounts`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| provider | ENUM('airtel_money','mtn_momo') NOT NULL | |
| phone_number | VARCHAR(20) NOT NULL | |
| display_name | VARCHAR(255) | |
| is_active | BOOLEAN DEFAULT TRUE | |
| last_synced_at | TIMESTAMP NULL | |
| sync_status | ENUM('synced','syncing','error','pending') DEFAULT 'pending' | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `sync_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| mobile_money_account_id | UUID (FK → mobile_money_accounts.id) | |
| status | ENUM('success','failed','partial') | |
| transactions_synced | INTEGER DEFAULT 0 | |
| error_message | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| type | ENUM('budget_alert','savings_reminder','sync_status','insight','general') | |
| title | VARCHAR(255) NOT NULL | |
| body | TEXT NOT NULL | |
| is_read | BOOLEAN DEFAULT FALSE | |
| action_url | TEXT | Deep link to relevant screen |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `financial_insights`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → users.id) | |
| insight_type | ENUM('spending_tip','savings_tip','budget_tip','trend_alert','category_insight') | |
| title | VARCHAR(255) NOT NULL | |
| body | TEXT NOT NULL | |
| priority | ENUM('low','medium','high') DEFAULT 'medium' | |
| is_read | BOOLEAN DEFAULT FALSE | |
| generated_at | TIMESTAMP DEFAULT NOW() | |
| expires_at | TIMESTAMP NULL | |

#### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| actor_id | UUID (FK → users.id) NULL | NULL = system action |
| actor_type | ENUM('user','admin','system') | |
| action | VARCHAR(100) NOT NULL | e.g., 'user.login', 'admin.deactivate_user' |
| resource_type | VARCHAR(100) | e.g., 'user', 'transaction' |
| resource_id | UUID | |
| details | JSONB | Additional context |
| ip_address | INET | |
| created_at | TIMESTAMP DEFAULT NOW() | |

---

## 4. Backend API (Node.js + Express)

### 4.1 Project Structure

```
backend-api/
├── src/
│   ├── config/           # Database, env, constants
│   ├── middleware/        # Auth, validation, error handling
│   ├── routes/           # Route definitions
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/           # Sequelize models
│   ├── validators/       # Zod/Joi schemas for request validation
│   ├── utils/            # Helpers (pagination, date ranges, etc.)
│   └── app.js            # Express app setup
├── migrations/           # Sequelize migrations
├── seeders/              # Seed scripts
├── tests/                # Unit tests
├── .env.example          # Required environment variables
├── package.json
└── README.md
```

### 4.2 API Endpoints

#### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| PUT | `/api/v1/auth/change-password` | Change password (authenticated) |

#### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get current user profile |
| PUT | `/api/v1/users/me` | Update profile |
| PUT | `/api/v1/users/me/preferences` | Update financial preferences |
| DELETE | `/api/v1/users/me` | Soft-delete account |

#### Transactions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/transactions` | List transactions (paginated, filterable) |
| GET | `/api/v1/transactions/:id` | Get transaction details |
| POST | `/api/v1/transactions` | Create manual transaction |
| PUT | `/api/v1/transactions/:id` | Update transaction |
| DELETE | `/api/v1/transactions/:id` | Delete transaction |
| PUT | `/api/v1/transactions/:id/category` | Change transaction category |
| GET | `/api/v1/transactions/summary` | Get spending summary for period |

**Query params for GET /transactions:** `page`, `limit`, `start_date`, `end_date`, `category_id`, `type`, `source`, `min_amount`, `max_amount`, `search`

#### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/categories` | List all categories |
| POST | `/api/v1/categories` | Create custom category |
| PUT | `/api/v1/categories/:id` | Update category (admin or owner) |
| DELETE | `/api/v1/categories/:id` | Delete category (admin only, not if system) |

#### Budgets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/budgets` | List user's budgets |
| GET | `/api/v1/budgets/:id` | Get budget with spent amount |
| POST | `/api/v1/budgets` | Create budget |
| PUT | `/api/v1/budgets/:id` | Update budget |
| DELETE | `/api/v1/budgets/:id` | Delete budget |
| GET | `/api/v1/budgets/:id/spending` | Get spending breakdown for budget |

#### Savings Goals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/savings` | List savings goals |
| GET | `/api/v1/savings/:id` | Get savings goal with progress |
| POST | `/api/v1/savings` | Create savings goal |
| PUT | `/api/v1/savings/:id` | Update savings goal |
| DELETE | `/api/v1/savings/:id` | Delete savings goal |
| POST | `/api/v1/savings/:id/entries` | Add savings entry |
| GET | `/api/v1/savings/:id/predictions` | Get savings prediction |

#### Mobile Money Integration
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/mobile-money/accounts` | List connected accounts |
| POST | `/api/v1/mobile-money/accounts` | Connect account |
| DELETE | `/api/v1/mobile-money/accounts/:id` | Disconnect account |
| POST | `/api/v1/mobile-money/accounts/:id/sync` | Trigger sync |
| GET | `/api/v1/mobile-money/accounts/:id/sync-status` | Get sync status |
| GET | `/api/v1/mobile-money/sync-logs` | Get sync history |

#### Analytics & Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analytics/dashboard` | Dashboard summary data |
| GET | `/api/v1/analytics/monthly-comparison` | Month-over-month comparison |
| GET | `/api/v1/analytics/category-breakdown` | Spending by category |
| GET | `/api/v1/analytics/trends` | Spending trends over time |
| GET | `/api/v1/analytics/savings-trends` | Savings trends |

#### Financial Insights
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/insights` | List financial insights |
| PUT | `/api/v1/insights/:id/read` | Mark insight as read |
| GET | `/api/v1/insights/tips` | Get personalized financial tips |

#### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/notifications` | List notifications |
| PUT | `/api/v1/notifications/:id/read` | Mark as read |
| PUT | `/api/v1/notifications/read-all` | Mark all as read |
| PUT | `/api/v1/notifications/preferences` | Update notification settings |

#### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/users/:id` | Get user details |
| PUT | `/api/v1/admin/users/:id/status` | Activate/deactivate user |
| GET | `/api/v1/admin/audit-logs` | View audit logs |
| GET | `/api/v1/admin/stats` | System statistics |
| PUT | `/api/v1/admin/categories` | Configure categories |
| GET | `/api/v1/admin/system` | System configuration |
| PUT | `/api/v1/admin/system` | Update system settings |

### 4.3 Middleware

- **auth.js** — JWT verification, role extraction
- **rateLimiter.js** — Rate limiting (e.g., 100 req/min per user)
- **validate.js** — Request body/query validation with Zod
- **errorHandler.js** — Centralized error handling
- **audit.js** — Audit logging middleware for sensitive operations

### 4.4 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

---

## 5. ML Service (Python + FastAPI)

### 5.1 Project Structure

```
ml-service/
├── app/
│   ├── models/           # ML model files and loading code
│   ├── services/         # Business logic
│   ├── api/              # FastAPI routes
│   ├── utils/            # Feature engineering, helpers
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── models/               # Saved model files (.pkl, .joblib)
├── data/                 # Training data directory
├── notebooks/            # Jupyter notebooks for development
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```

### 5.2 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ml/v1/categorize` | Categorize a transaction |
| POST | `/ml/v1/categorize-batch` | Categorize multiple transactions |
| GET | `/ml/v1/predictions/savings/{user_id}` | Get savings prediction |
| POST | `/ml/v1/train/retrain` | Trigger model retraining (admin) |
| GET | `/ml/v1/health` | Health check |

### 5.3 ML Models

#### Transaction Categorization
- **Approach:** Initially rule-based with keyword matching. Upgradeable to a trained classifier (Naive Bayes or Random Forest) once sufficient data is accumulated.
- **Input:** Transaction description, amount, source, merchant name
- **Output:** Category ID + confidence score
- **Fallback:** If confidence < threshold, flag for manual categorization

#### Savings Prediction
- **Approach:** Linear regression or time-series forecasting (using historical savings entries and transaction data)
- **Input:** User's savings history, spending history, savings goal parameters
- **Output:** Predicted monthly savings, estimated goal completion date, confidence interval
- **Fallback:** If insufficient data (< 3 months), return message: "Not enough data for prediction. Continue tracking to enable insights."

### 5.4 Inter-Service Communication

The Node.js backend communicates with the ML service via internal HTTP calls. The ML service runs on a separate port (default: 5001). Docker Compose provides service discovery.

```
Flutter App → Node.js API → ML Service (FastAPI)
                         → PostgreSQL
```

---

## 6. Admin Dashboard (React + Vite)

### 6.1 Project Structure

```
admin-dashboard/
├── src/
│   ├── components/       # UI components
│   ├── pages/            # Page views
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API client calls
│   ├── store/            # State management (Zustand or Context)
│   ├── utils/            # Helpers
│   └── App.jsx
├── public/
├── package.json
└── vite.config.js
```

### 6.2 Pages

- **Login** — Admin authentication
- **Dashboard** — System overview (user count, transaction volume, active budgets, etc.)
- **Users** — User list with search, filter, activate/deactivate actions
- **User Detail** — View individual user's info, transactions, budgets
- **Categories** — Manage system categories (add, edit, delete)
- **Audit Logs** — Searchable audit log viewer
- **System Settings** — App configuration (alert thresholds, default settings, etc.)

### 6.3 Tech Choices

- **UI Library:** Tailwind CSS + shadcn/ui (or MUI)
- **State:** Zustand (lightweight)
- **Routing:** React Router v6
- **API Calls:** Axios with interceptors for auth

---

## 7. Flutter Mobile App

### 7.1 Project Structure

```
flutter-app/
├── lib/
│   ├── main.dart
│   ├── app/              # App config, routing, theme
│   ├── core/             # Constants, utils, services (API, auth, storage)
│   ├── data/             # Data models, repositories, data sources
│   ├── domain/           # Business logic, use cases
│   ├── presentation/     # UI screens and widgets
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── savings/
│   │   ├── analytics/
│   │   ├── settings/
│   │   ├── mobile_money/
│   │   └── common/       # Shared widgets
│   └── l10n/             # Localization (English, with structure for future Bemba/Nyanja)
├── android/
├── test/
├── pubspec.yaml
└── README.md
```

### 7.2 Key Dependencies

| Package | Purpose |
|---|---|
| `http` or `dio` | API communication |
| `hive` | Local offline storage |
| `hive_flutter` | Hive Flutter integration |
| `fl_chart` | Charts and graphs |
| `google_fonts` | Typography |
| `flutter_local_notifications` | Local + push notifications |
| `firebase_core` + `firebase_messaging` | FCM for push notifications |
| `connectivity_plus` | Network status detection |
| `intl` | Date/number formatting (ZMW) |
| `provider` or `riverpod` | State management |
| `go_router` | Navigation/routing |
| `cached_network_image` | Image caching |

### 7.3 Screens

#### Auth Flow
- **Login Screen** — Email + password
- **Register Screen** — Name, email, phone (optional), password, confirm password
- **Forgot Password Screen** — Email input, reset link sent
- **OTP/Verification Screen** — If email verification is needed

#### Main App
- **Dashboard Screen** — Summary cards (income, expenses, budget remaining, savings progress), recent transactions, quick insights
- **Transactions Screen** — List with search/filter, pull-to-refresh, add manual transaction FAB
- **Transaction Detail Screen** — Full details, edit category
- **Budget Screen** — List of budgets, progress bars, create/edit budget
- **Budget Detail Screen** — Spending breakdown by category, historical comparison
- **Savings Goals Screen** — Goal cards with progress circles, create/edit goal
- **Savings Goal Detail Screen** — Progress chart, add savings entry, prediction display
- **Analytics Screen** — Charts (pie for categories, bar for monthly comparison, line for trends)
- **Mobile Money Screen** — Connected accounts, sync status, connect/disconnect
- **Notifications Screen** — Notification list with badges
- **Settings Screen** — Profile, preferences, password change, notification settings, about
- **Admin Screen** — (Role-gated) User management, system stats

### 7.4 Offline Support Strategy

- **Hive** stores a local copy of transactions, budgets, savings goals, categories, and user profile
- On app launch, attempt sync with backend; if offline, serve cached data
- Manual transactions created offline are queued in a local `pending_sync` box and synced when connectivity returns
- Conflict resolution: server wins for synced data; local wins for pending offline entries
- Cache TTL: 24 hours; show staleness indicator if data is older
- On sync, update Hive cache with fresh server data

---

## 8. Authentication & Security

### 8.1 JWT Flow

```
Login → Server returns { accessToken (15min), refreshToken (7d) }
         Client stores accessToken in memory, refreshToken securely

API Request → Authorization: Bearer <accessToken>
  ├─ 200 OK
  └─ 401 → POST /auth/refresh → New accessToken
            └─ 403 → Redirect to login
```

### 8.2 Password Security

- Hashed with **bcrypt** (12 rounds)
- Minimum 8 characters, at least 1 number and 1 letter
- Rate limiting on login: 5 failed attempts → 15 minute lockout

### 8.3 Role-Based Access Control

| Role | Permissions |
|---|---|
| **User** | Own data CRUD, budget management, savings, analytics |
| **Admin** | All user permissions + user management, audit logs, system config |
| **Super Admin** | All admin permissions + category configuration, system settings |

### 8.4 Data Protection

- All API traffic over HTTPS (TLS 1.2+)
- Sensitive fields (passwords, tokens) never logged
- Mobile money API keys stored in server-side environment variables, never in client
- Financial data encrypted at rest in PostgreSQL (pgcrypto for sensitive columns)

---

## 9. Notifications

### 9.1 Push Notifications (FCM)

- Firebase project setup for Android
- FCM token stored per device in a `devices` table
- Triggered by:
  - Budget threshold exceeded (checked during transaction sync)
  - Savings reminder (scheduled daily check)
  - Sync status changes
  - New financial insight generated

### 9.2 Email Notifications

- **Service:** Nodemailer with SMTP (or transactional email service)
- **Triggers:** Welcome email, password reset, weekly spending summary (opt-in)
- **Templates:** HTML email templates for each notification type

---

## 10. Database Seeding

### 10.1 Seed Script Capabilities

The seed script (`scripts/seed.ts`) will:

1. Create 3 sample users with different profiles
2. Create 1 admin user
3. Populate categories (all default categories)
4. Generate 6 months of realistic sample transactions for each user:
   - Mix of income (salary, mobile money top-ups) and expenses
   - Realistic Zambian spending patterns (e.g., market purchases, transport fares, airtime, electricity bills)
   - Amounts in ZK (ranging from K5 to K15,000)
   - Distributed across all categories
5. Create sample budgets per user
6. Create sample savings goals with entries
7. Connect sample mobile money accounts with mock transaction history
8. Generate sample notifications and insights

### 10.2 Running Seeds

```bash
# Development
npm run seed

# Reset and reseed
npm run seed:reset
```

---

## 11. Docker Compose (Local Development)

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: smart_budget_zm
      POSTGRES_USER: sbz_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend-api:
    build: ./apps/backend-api
    ports: ["3000:3000"]
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgresql://sbz_user:${DB_PASSWORD}@postgres:5432/smart_budget_zm
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ML_SERVICE_URL: http://ml-service:5001

  ml-service:
    build: ./apps/ml-service
    ports: ["5001:5001"]

  admin-dashboard:
    build: ./apps/admin-dashboard
    ports: ["5173:5173"]
    environment:
      VITE_API_URL: http://localhost:3000
```

---

## 12. Environment Variables

### Backend API (.env)
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://sbz_user:password@localhost:5432/smart_budget_zm
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ML_SERVICE_URL=http://localhost:5001
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
FCM_SERVER_KEY=your-fcm-key
```

### ML Service (.env)
```
PORT=5001
DATABASE_URL=postgresql://sbz_user:password@localhost:5432/smart_budget_zm
MODEL_PATH=./models
LOG_LEVEL=INFO
```

### Flutter App (.env or --dart-define)
```
API_BASE_URL=http://10.0.2.2:3000/api/v1
FCM_PROJECT_ID=your-firebase-project-id
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Weeks 1–3)
- [ ] Set up monorepo structure
- [ ] Initialize all projects (backend, ML, Flutter, admin)
- [ ] Configure Docker Compose
- [ ] Set up PostgreSQL database, migrations, seed scripts
- [ ] Implement backend auth (register, login, refresh, logout)
- [ ] Create Flutter app skeleton with auth screens
- [ ] Basic CI/CD (lint, build checks)

### Phase 2: Core Features (Weeks 4–7)
- [ ] Transaction CRUD API endpoints
- [ ] Flutter transaction screens (list, detail, manual entry, search/filter)
- [ ] Category API and Flutter integration
- [ ] Budget CRUD API endpoints
- [ ] Flutter budget screens (create, view, progress)
- [ ] Savings goals CRUD API endpoints
- [ ] Flutter savings screens (create, view, add entries)
- [ ] Mobile money integration layer (API stubs, connect/disconnect, sync triggers)
- [ ] Offline support (Hive caching, pending sync queue)

### Phase 3: Analytics & Intelligence (Weeks 8–10)
- [ ] Analytics API endpoints (summary, comparison, breakdown, trends)
- [ ] Flutter analytics screens with charts
- [ ] Dashboard API and Flutter dashboard screen
- [ ] ML service: transaction categorization model
- [ ] ML service: savings prediction model
- [ ] Financial insights generation
- [ ] Notifications system (FCM setup, push + email)

### Phase 4: Admin & Polish (Weeks 11–13)
- [ ] Admin dashboard: login, user management, audit logs, categories, stats
- [ ] Admin API endpoints
- [ ] Flutter admin screen (role-gated)
- [ ] Security hardening (rate limiting, input validation, SQL injection prevention)
- [ ] Error handling and edge cases
- [ ] UI polish and accessibility review

### Phase 5: Testing & Deployment (Weeks 14–16)
- [ ] Unit tests for critical paths
- [ ] Integration tests for API endpoints
- [ ] UAT preparation (test scenarios, test data)
- [ ] Deployment setup (self-hosted server configuration)
- [ ] Documentation (API docs, user guide, admin guide)
- [ ] Final review and submission

---

## 14. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend language | Node.js/Express | User preference; fast development, JSON-native |
| Database | PostgreSQL | User preference; relational for financial data |
| ML service | Separate Python/FastAPI | Best ecosystem for ML; isolated for independent scaling |
| Mobile money | Integration layer only | No real APIs available; architecture ready for future |
| Offline support | Full (Hive) | URD requirement for poor connectivity areas |
| Auth | JWT with refresh tokens | Stateless, standard, works well with Flutter |
| Currency | ZMW only | Focused on Zambian market per URD |
| Monorepo | Yes with Docker Compose | Simplifies cross-service development |
| Dashboard | Simple | Quick to build; can be enhanced later |
| Testing | Minimal initially | Focus on features; tests can be added incrementally |

---

## 15. Success Criteria (from URD Section 18)

The system is complete when:

1. ✅ Users can register and securely authenticate (JWT)
2. ✅ Users can manage profiles
3. ✅ Transactions can be recorded (manual) and displayed
4. ✅ Mobile money integration layer architecture is in place
5. ✅ Transactions are categorized (auto + manual)
6. ✅ Users can create and monitor budgets
7. ✅ Users can create and monitor savings goals
8. ✅ Dashboard displays financial analytics (simple)
9. ✅ ML service generates savings predictions
10. ✅ Personalized financial insights are generated
11. ✅ Admins can manage users and system settings
12. ✅ Security and privacy requirements met
13. ✅ App handles network failures gracefully (offline support)
14. ✅ Unit and integration tests for critical paths

---

## 16. Out of Scope

Per URD Section 5.2, the following are NOT included:

- Direct loan issuance
- Investment trading
- Cryptocurrency functionality
- Banking services
- Acting as a bank or mobile money provider
- Direct management of user funds
- Automated investment transactions
- iOS support (Android-only initially)

---

## 17. Open Questions / Future Considerations

- **ML Model Training Data:** The ML service will use synthetic data initially. Real-world transaction data may be collected (with consent) for model improvement.
- **Mobile Money API Access:** The integration layer is designed for future connection. Actual API access depends on provider authorization.
- **Localization:** The app will be English-only initially. Architecture supports future Bemba/Nyanja localization.
- **Payment for Hosting:** The self-hosted deployment will need a server. Consider VPS options (DigitalOcean, Hetzner, etc.) for cost-effective hosting.
- **Multi-language:** Flutter's localization framework is set up for future expansion.
