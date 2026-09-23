# Student Kwacha 💰

A full-stack mobile budgeting application for the Zambian market, built for **students**. Create monthly budgets, connect PayPal, and have your budget funded automatically on the date you choose — with money **restricted to the expense category it was allocated to**. Track transactions, set savings goals, and receive personalized financial insights.

## Tech Stack

| Component | Technology |
|---|---|
| **Mobile App** | Flutter (Android) |
| **Backend API** | Node.js + Express |
| **Database** | PostgreSQL 16 |
| **ML Service** | Python + FastAPI |
| **Admin Dashboard** | React + Vite + Tailwind |
| **Auth** | JWT (access + refresh tokens) |
| **Offline Storage** | Hive (Flutter) |
| **Notifications** | Push (FCM) + Email |
| **Payments** | Card-only via PayPal processor (Sandbox) — hold on funding, capture per spend |
| **Orchestration** | Docker Compose |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Flutter SDK (for mobile app)
- PostgreSQL (if running locally)

### 1. Start All Services

```bash
# Clone the repo
git clone <repo-url>
cd smart-budget-zm

# Copy environment file
cp .env.example .env

# Start with Docker Compose
cd docker
docker-compose up -d
```

### 2. Seed the Database

```bash
# Install backend dependencies
cd apps/backend-api
npm install

# Run seed script
node scripts/seed.js
```

This creates:
- 3 sample users + 1 admin
- 11 spending categories
- 6 months of realistic Zambian transactions per user
- Sample budgets with linked cards and funded allocations
- Sample notifications and financial insights

### 3. Access the Services

| Service | URL |
|---|---|
| **Backend API** | http://localhost:3300 |
| **Admin Dashboard** | http://localhost:5173 |
| **ML Service** | http://localhost:5001 |
| **API Health Check** | http://localhost:3300/api/v1/health |

### Login Credentials

| Role | Email | Password |
|---|---|---|
| User | khadijah@example.com | password123 |
| User | james@example.com | password123 |
| User | grace@example.com | password123 |
| Admin | admin@studentkwacha.com | admin123 |

Seeded users are students with a linked Visa card (•• 4242) and a funded "Monthly Living Expenses" budget (Food K800, Transport K400, Housing K1,500, Communication K200, Other K100 — K3,000 total).

## Student Budgeting User Flow

```
Sign up (name, email, password, institution, student ID)
   ↓
Link card  (mandatory onboarding — no PayPal account needed;
            card vaulted with PayPal, only brand + last4 stored)
   ↓
Create Budget → set amount, funding date, frequency
   ↓
Add expense allocations per category (Food K800, …)
   ↓
Review summary → Confirm & Activate
   ↓
On the funding date: the linked card is charged
   ├── fails → notification with reason → Update Card / Retry
   └── succeeds → wallet credited, allocations funded
         ↓
Spend (wallet pay with category) → drawn ONLY from that category's allocation
   ↓
Next funding date → repeat
```

Existing users who have not linked a card are routed to the card-link screen on
app open until they do — the gate is enforced by the router and by
`GET /api/v1/payment-methods/onboarding-status`.

**Budget-restricted spending:** funds allocated to a budget category can only be
spent on that category (`POST /api/v1/wallet/pay` with `category_id`). Payments
exceeding an allocation, uncategorised payments, and payments to unallocated
categories are rejected with `BUDGET_RESTRICTION` while funded budgets exist.

**Payment modes:** with no `PAYPAL_CLIENT_ID` configured the system runs in a
clearly-labelled **simulated mode** — charges succeed instantly (amounts with
`.13`/`.99` cents simulate declines so the failure → notify → retry flow can be
demonstrated; any Luhn-valid card like `4242 4242 4242 4242` links in demo
mode). Set PayPal credentials to run against the real **PayPal Sandbox** REST
API (default base URL) for vaulted-card charges.

## Verifying the User Flow

```bash
# In-process end-to-end checks (25 assertions: signup → funding →
# restricted spending → failure/retry → recurrence)
cd apps/backend-api && node scripts/verify-user-flow.js

# HTTP smoke test against a running server (21 assertions)
PORT=3399 node src/app.js &
node scripts/smoke-api.js http://127.0.0.1:3399/api/v1
```

## Project Structure

```
smart-budget-zm/
├── apps/
│   ├── flutter-app/          # Flutter mobile app (Android)
│   ├── backend-api/          # Node.js Express REST API
│   ├── ml-service/           # Python FastAPI ML microservice
│   └── admin-dashboard/      # React + Vite admin panel
├── docker/
│   └── docker-compose.yml    # Service orchestration
├── Smart_Budget_ZM_URD.md    # User Requirements Document
├── Smart_Budget_ZM-spec.md   # System Specification
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` — Register a new user
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Logout
- `PUT /api/v1/auth/change-password` — Change password

### Transactions
- `GET /api/v1/transactions` — List (paginated, filterable)
- `POST /api/v1/transactions` — Create manual transaction
- `GET /api/v1/transactions/summary` — Spending summary

### Budgets
- `GET /api/v1/budgets` — List budgets with spent amounts + per-category allocations
- `POST /api/v1/budgets` — Create budget (name, amount, `frequency`, `funding_day`, `allocations[]`)
- `POST /api/v1/budgets/:id/activate` — Confirm & activate (requires PayPal for auto-funding)
- `POST /api/v1/budgets/:id/retry-funding` — Retry a failed PayPal funding charge
- `GET /api/v1/budgets/funding-status` — Funding overview (due/failed/upcoming, funds held)
- `GET /api/v1/budgets/:id/spending` — Spending breakdown
- `GET /api/v1/budgets/alerts` — Budget warnings (generates notifications at the alert threshold / when exceeded)
- `GET /api/v1/budgets/prediction` — ML overspending & budget-exhaustion prediction for the month

> **Strict budgets:** with `enforce: true`, expense transactions that would push the budget
> over its limit are rejected with `BUDGET_LIMIT_EXCEEDED` (spending control).

### Payment Methods (cards, vaulted via PayPal)
- `GET /api/v1/payment-methods/onboarding-status` — Card-link gate status + payment mode
- `GET /api/v1/payment-methods` — List linked cards (brand + last4 only)
- `POST /api/v1/payment-methods/link-card` — Link a card (Luhn + expiry validated, vaulted at PayPal)
- `PUT /api/v1/payment-methods/:id/default` — Make default funding source
- `DELETE /api/v1/payment-methods/:id` — Unlink

### Savings Goals
- `GET /api/v1/savings` — List savings goals
- `POST /api/v1/savings` — Create savings goal
- `POST /api/v1/savings/:id/entries` — Add savings entry
- `GET /api/v1/savings/:id/predictions` — Get savings prediction

### Analytics
- `GET /api/v1/analytics/dashboard` — Dashboard summary
- `GET /api/v1/analytics/monthly-comparison` — Month-over-month
- `GET /api/v1/analytics/category-breakdown` — Spending by category
- `GET /api/v1/analytics/trends` — Spending trends

### Wallet / Payments (PayPal card processing)
- `GET /api/v1/wallet` — Balance, open card holds (`funds_held_on_card`), spending limits
- `POST /api/v1/wallet/pay` — Pay a budget expense (captures from the budget's card hold; category required)
- `GET /api/v1/wallet/transactions` — Wallet transaction history
- `PUT /api/v1/wallet/limits` — Set daily/monthly spending controls

> Money movement is card-only through PayPal: funding **authorizes a hold** on the
> student's card, each budget expense **captures** its portion (a real card transaction
> on the PayPal dashboard), and unspent hold balances are **voided** at cycle end.
> There are no wallet top-ups — the wallet only ever holds budget funds.
> Runs in **simulated mode** until `PAYPAL_CLIENT_ID`/`PAYPAL_SECRET` are configured.

### ML Service
- `POST /ml/v1/categorize` — Auto-categorize transaction
- `POST /ml/v1/predictions/savings/:user_id` — Savings prediction
- `POST /ml/v1/predictions/overspending` — Overspending / budget-exhaustion prediction

## Currency

All amounts are in **Zambian Kwacha (ZMW)**, displayed as `K`.

## Running Locally (Without Docker)

```bash
# Backend API
cd apps/backend-api
npm install
cp .env.example .env
node src/app.js

# ML Service
cd apps/ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5001

# Admin Dashboard
cd apps/admin-dashboard
npm install
npm run dev

# Flutter App
cd apps/flutter-app
flutter pub get
flutter run
```

## License

This project is for academic purposes.
