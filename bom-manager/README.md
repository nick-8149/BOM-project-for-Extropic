# BOM Verification & Obsolescence Management System

An enterprise-grade Bill of Materials (BOM) management, part identity resolution, and obsolescence lifecycle tracking platform. The system ingests engineering BOMs (.xlsx, .xls, .csv), resolves manufacturer and part identities, executes strict safety gatekeeping, tracks real component lifecycle statuses, scores sourcing and obsolescence risks, and suggests form-fit-function replacement candidates.

---

## Key Capabilities

1. **Multi-Format BOM Ingestion & Parsing:**
   - Ingests complex BOMs with automatic column mapping for Manufacturer Part Numbers (MPN), Internal Part Numbers (IPN), Manufacturers, Suppliers, Quantities, and Descriptions.
   - Normalizes part numbers and canonicalizes manufacturer names (e.g., `TI` $\rightarrow$ `Texas Instruments`).

2. **Identity Resolution & Safety Gatekeeping:**
   - Classifies part numbers into MPN vs. IPN.
   - Requires explicit verified IPN $\rightarrow$ MPN mapping before any external lookup can occur.
   - Strict Gatekeeper (`IdentityResolver.can_lookup_lifecycle`) blocks ambiguous, unreviewed, or unverified parts from querying lifecycle providers.

3. **Multi-Provider Lifecycle Architecture:**
   - **Database-First Lookup:** Direct retrieval of persisted real provider data without network calls.
   - **Nexar Provider Adapter:** High-accuracy component intelligence client with OAuth2 token caching and strict match evaluation.
   - **Provider Registry:** Centralized, pluggable registry (`LifecycleProviderRegistry`) with lazy factories and explicit error handling.
   - **Fallback Orchestration:** Disambiguates genuine `NO_MATCH` from provider errors (HTTP 429 rate limits, HTTP 401 auth failures, timeouts). System errors never trigger fallback.

4. **Alias Review & Controlled Variants:**
   - Review candidate generation for close matches and packaging variants.
   - Human-in-the-loop conversion to `DRAFT` status with separate verification action.
   - Strict qualification variant protection (`LM124AWG` $\rightarrow$ `LM124AWGRQMLV` remains blocked).

5. **Risk Engine & Dashboard Analytics:**
   - Multi-factor risk scoring (0–100) combining lifecycle obsolescence status, EOL proximity, supplier authorization, RoHS compliance, and match confidence.
   - Real-time dashboard with lifecycle distributions, approaching EOL timelines, and exportable Excel reports.

6. **Replacement Candidates Engine:**
   - Pin-compatible, active, RoHS-compliant replacement matching.
   - AI-assisted replacement compatibility analysis.

---

## Technology Stack

- **Backend:**
  - **Framework:** FastAPI (Python 3.13)
  - **ASGI Server:** Uvicorn
  - **ORM & Database:** SQLAlchemy 2.0 (Asyncio) with `aiosqlite` (SQLite)
  - **Data Processing:** Pandas, OpenPyXL, RapidFuzz
  - **Validation:** Pydantic v2 & Pydantic-Settings
  - **Security:** Python-Jose (JWT HS256), Passlib (Bcrypt)
  - **Testing:** Pytest, AnyIO, Pytest-Asyncio
- **Frontend:**
  - **Framework:** React 19, TypeScript
  - **Build Tool:** Vite 8.2 (Rolldown engine)
  - **Routing:** React Router v7
  - **Styling:** TailwindCSS v4
  - **Visualizations:** Recharts, Lucide Icons

---

## Architecture & Data Flow

```mermaid
flowchart TD
    A[BOM File .xlsx / .csv] --> B[BOM Parser & Normalizer]
    B --> C[Identity Resolver]
    C --> D{Safety Gatekeeper<br/>can_lookup_lifecycle?}
    D -- "Blocked" --> E[Part Marked BLOCKED / Review Needed]
    D -- "Resolved" --> F{Database-First Lookup<br/>PartIdentityLifecycle}
    F -- "Found Real Data" --> G[Return Persisted Lifecycle Record]
    F -- "No DB Hit" --> H[Lifecycle Provider Registry]
    H --> I[Primary Provider: Nexar Client / Adapter]
    I -- "Match Found" --> J[Normalize & Persist Record]
    I -- "System Error (429/401/Timeout)" --> K[Record FAILED Status (No Fallback)]
    I -- "Genuine NO_MATCH" --> L{Secondary Provider Available?}
    L -- "Yes" --> M[Secondary Provider Lookup]
    L -- "No" --> N[Record NOT_AVAILABLE]
    J --> O[Risk Engine Evaluation]
    O --> P[Interactive Dashboard & Reports]
```

---

## Repository Structure

```
bom-manager/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API endpoints (lifecycle, boms, aliases, etc.)
│   │   ├── core/            # Security, JWT authentication, and token handling
│   │   ├── models/          # SQLAlchemy async models (Part, BOM, Lifecycle, etc.)
│   │   ├── schemas/         # Pydantic request and response schemas
│   │   ├── services/
│   │   │   ├── identity/    # PartClassifier, ManufacturerCanonicalizer, Resolver
│   │   │   ├── lifecycle/   # Provider ABC, NexarAdapter, MockProvider, Registry, Service
│   │   │   ├── ai/          # AI replacement analysis service & schemas
│   │   │   ├── risk_engine.py       # Multi-factor risk calculation
│   │   │   ├── replacement_engine.py # Replacement candidate matching
│   │   │   ├── matcher.py           # Layered part matching engine
│   │   │   └── bom_processor.py     # BOM parsing and file persistence
│   │   ├── config.py        # Central Pydantic settings
│   │   ├── database.py      # Async SQLite session management
│   │   └── main.py          # FastAPI application entrypoint
│   ├── tests/               # Pytest suite (118 passing tests)
│   ├── bom_manager.db       # Active SQLite database (21 real Nexar records)
│   ├── requirements.txt     # Python backend dependencies
│   └── seed_data.py         # Seed script for initial catalog data
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API clients
│   │   ├── components/      # UI components (LifecycleBadge, Modals, Tables)
│   │   ├── layouts/         # App Layout, Sidebar, Header
│   │   ├── pages/           # Dashboard, BOMDetail, Lifecycle, Aliases, Admin
│   │   ├── App.tsx          # Root routing and context
│   │   └── main.tsx         # React DOM mount point
│   ├── package.json         # Frontend dependencies and build scripts
│   └── vite.config.ts       # Vite bundler configuration
├── docs/                    # Architecture, API specifications, and Handover guides
└── README.md                # Project documentation
```

---

## Prerequisites

- **Python:** 3.11, 3.12, or 3.13
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** npm (bundled with Node)

---

## Setup & Startup Guide

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   *(Or create a new one: `python -m venv venv` and install: `pip install -r requirements.txt`)*
3. Ensure `.env` is configured (see [Configuration & Security](#configuration--security)).
4. Start the backend development server:
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - **API Documentation (Swagger UI):** `http://localhost:8000/docs`
   - **Health Check Endpoint:** `http://localhost:8000/health`

### 2. Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   - **Web UI:** `http://localhost:5173/`

### 3. Production Frontend Build

To build the static production distribution:
```powershell
cd frontend
npm run build
```
Build output is generated in `frontend/dist/`.

---

## Database & Data Safety Instructions

The production database is located at:
`backend/bom_manager.db`

> [!CAUTION]
> **DO NOT RESET, RECREATE, OR RESEED THE DATABASE.**
> - `bom_manager.db` contains **21 verified real Nexar lifecycle records**, **26 verified identity mappings**, and active user BOMs.
> - Running `seed_data.py` on an existing database is unnecessary and will re-introduce synthetic demo catalog entries.
> - Table creation for new models is handled safely and automatically via `python init_db.py` without deleting data.

### Creating a Database Backup
Before performing system migrations or maintenance:
```powershell
Copy-Item backend/bom_manager.db backend/bom_manager.db.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')
```

---

## Configuration & Security

Configuration is managed via environment variables defined in `backend/.env`.

### Environment Variable Names:

| Variable Name | Purpose | Example / Default |
|---|---|---|
| `APP_NAME` | Name of the application | `"BOM Verification cum Obsolescence Manager"` |
| `APP_VERSION` | Application semver string | `"0.1.0"` |
| `DEBUG` | FastAPI debug mode | `True` (dev) / `False` (prod) |
| `DATABASE_URL` | SQLite async database connection string | `sqlite+aiosqlite:///./bom_manager.db` |
| `SECRET_KEY` | JWT HS256 encryption secret | Must be a strong random string in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration in minutes | `60` |
| `CORS_ORIGINS` | JSON list of allowed origins | `'["http://localhost:5173","http://localhost:3000"]'` |
| `UPLOAD_DIR` | Directory for uploaded BOM files | `./uploads` |
| `MAX_UPLOAD_SIZE_MB` | File size limit in megabytes | `50` |
| `FUZZY_MATCH_THRESHOLD` | Minimum score for fuzzy part match | `75` |
| `HIGH_CONFIDENCE_THRESHOLD` | High confidence match cutoff | `90` |
| `EOL_ALERT_THRESHOLD_YEARS` | Years to EOL to trigger alerts | `2` |
| `NEXAR_CLIENT_ID` | Nexar API OAuth2 Client ID | Loaded from `.env` (never hardcoded) |
| `NEXAR_CLIENT_SECRET` | Nexar API OAuth2 Client Secret | Loaded from `.env` (never hardcoded) |
| `AI_PROVIDER` | AI provider for smart replacements | `gemini` (or openai, anthropic, ollama) |
| `AI_API_KEY` | API Key for AI service | Loaded from `.env` (never exposed to frontend) |
| `AI_MODEL` | AI model identifier | `gemini-3.6-flash` |

### Security Invariants:
1. **Never commit `.env` or credentials** to source control. Ensure `.env`, database backups, and keys are listed in `.gitignore`.
2. **Rotate `SECRET_KEY`** in production environments.
3. **No credentials are sent to the frontend client**. All external API communications are performed server-side.

---

## Automated Test Suite

The test suite validates identity resolution, lifecycle gatekeeping, database-first lookups, multi-provider fallback orchestration, alias reviews, and data integrity without making live external API calls:

```powershell
cd backend
.\venv\Scripts\python -m pytest
```

### Verified Results:
- **Total Tests:** **118**
- **Passed:** **118**
- **Failed:** **0**
- **Execution Time:** ~7 seconds
- **External API Calls:** 0 (Deterministic doubles used)

---

## Current Limitations & Provider Roadmap

1. **Nexar API Quota:**
   - Nexar account contains a limited query allocation. External lookups are protected by database-first caching and gatekeeping.
2. **Secondary Providers (Z2Data, SiliconExpert):**
   - The multi-provider architecture and fallback orchestration are fully implemented.
   - Secondary providers are currently unconfigured in the registry pending receipt of official API documentation, credentials, and sandbox environments.
