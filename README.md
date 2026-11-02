# OAuth Readiness Intelligence

> **Know the work before you commit to the integration.**  
> Understand engineering effort, authorization requirements, architectural risks, vendor dependencies, and approval governance before writing integration code.

OAuth Readiness Intelligence is a zero-cost (₹0 operational budget) full-stack engineering platform for evaluating, investigating, and planning third-party OAuth 2.0 and API integrations. It pairs claim-level evidence verification with a Critical Path Method (CPM) project planner and structured implementation guide generator.

---

## Key Features

1. **Overview Executive Dashboard**
   - Integration readiness scorecard across 8 dimensions (OAuth Flow, Scopes, Governance, Data Access, Token Lifecycle, Rate Limits, SDK & Tooling, Security Hardening).
   - High-level metric aggregation and system status telemetry.

2. **App Discovery Intelligence**
   - Searchable, filterable catalogue featuring four comprehensive baseline providers:
     - **Linear**: OAuth 2.0 PKCE, rotating refresh tokens, leaky bucket rate limiting.
     - **Notion**: Internal vs Public integrations, page-by-page authorization, workspace boundaries.
     - **Gmail**: Google OAuth 2.0, Sensitive vs Restricted scope tiers, CASA Tier 2 assessment requirements.
     - **ServiceNow**: Enterprise ITSM, instance-configured scopes, Cross-Scope Privileges (CSP).
   - Strict distinction between verified provider claims and sample configurations.
   - Side-by-side multi-dimensional comparison matrix with explicit missing-evidence indicators.

3. **Live Investigation Engine**
   - Autonomous intake for unfamiliar SaaS targets via public documentation URLs.
   - Dual-mode extraction engine:
     - **Deterministic Extraction Pipeline**: Operates 100% locally with zero external API calls or billing.
     - **Gemini AI Extraction**: Optional enhancement when `GEMINI_API_KEY` is provided; automatically falls back to deterministic extraction if unreachable.
   - Hardened SSRF defense layer (`docRetrievalService.ts`):
     - DNS pre-resolution and IP validation before connection.
     - Blocking of private RFC 1918, link-local, loopback, IPv6 multicast, and IPv4-mapped IPv6 ranges.
     - Anti-DNS-rebinding pinning ensuring the validated IP is the exact IP dialed.
     - Independent per-hop redirect validation and response size capping (5MB max).

4. **Claim-Level Evidence Architecture**
   - Every technical claim is tracked with full audit provenance: `claimId`, `providerId`, `sourceUrl`, `sourceTitle`, `checkedAt`, `applicability`, `evidenceStatus`, `confidence`, and `supportingExcerpt`.
   - Five evidence statuses: `official_verified`, `independently_corroborated`, `estimated`, `hypothesis`, and `unknown`.
   - Seven-section inspector isolating verified findings from known unknowns and documentation gaps.

5. **Integration Readiness Planner & Implementation Guide Generator**
   - Translates investigation findings into 12 functional task categories.
   - Critical Path Method (CPM) dependency engine calculating earliest start, earliest finish, slack, and critical path sequence.
   - Three independent metrics:
     - **Active Hands-On Developer Effort**: Total developer hours across all tasks.
     - **External Waiting Time**: Vendor review and tenant administrator queues (with conditional bot verification alerts).
     - **Total Elapsed Timeline**: Calendar business days based on critical path hours and a 6-hour daily velocity (clearly disclaimed as estimated and not guaranteed).
   - **Task & Instruction Provenance**: Explicit badges for `PROVIDER_DOCUMENTED`, `GENERIC_ENGINEERING_RECOMMENDATION`, `PROJECT_ASSUMPTION`, and `UNVERIFIED_DEPENDENCY`.
   - **Risk Register**: Impact/likelihood scoring with actionable mitigations linked directly to documented claims.
   - **14-Section Engineering Guide**: Step-by-step developer specification with ready-to-use TypeScript code snippets and operational warnings.
   - **Markdown & JSON Export**: Downloadable full-fidelity plans for team handoff.

6. **Durable File-Based JSON Persistence**
   - Plans and task mutations are stored in `data/plans.json` on the server container filesystem.
   - Survives browser refreshes and server process restarts.
   - Zero-dependency, zero-billing implementation adhering strictly to the ₹0 budget constraint.

---

## Architecture

### Frontend (SPA)
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS (Midnight Navy `#0B1120`, Warm Ivory, Charcoal, Electric Lime `#A3E635`)
- **Icons**: Lucide React
- **Build Tool**: Vite 8

### Backend (Full-Stack)
- **Server**: Express 4 running on Node.js / `tsx`
- **Dev Mode**: Vite dev server mounted as Express middleware on port 3000
- **Prod Mode**: Serves statically compiled assets from `dist/` with Express API routes mounted under `/api`

---

## Getting Started

### Prerequisites
- Node.js 20+ (LTS recommended)
- npm 9+ or Bun

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd oauth-readiness-intelligence
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Copy `.env.example` to `.env` (optional; defaults work out of the box):
```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` | Port for the full-stack server |
| `HOST` | No | `0.0.0.0` | Host address to bind |
| `GEMINI_API_KEY` | No | `""` | Optional Gemini API key for AI-enhanced extraction. If omitted, the deterministic rule-based engine operates automatically without errors or billing. |
| `APP_URL` | No | `""` | Base URL of deployment (used for self-referential links) |

### 3. Development
Start the dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running the Test Suite
Execute the 75 automated unit and integration tests:
```bash
npm test
```

### 5. Type Checking & Linting
Run TypeScript type checking across frontend and backend:
```bash
npm run lint
```

### 6. Production Build & Execution
Build the client application and run the production server:
```bash
npm run build
npm start
```

---

## REST API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint returning uptime and environment status |
| `GET` | `/api/providers` | Retrieve all 4 baseline providers with claim counts and readiness |
| `GET` | `/api/providers/:id` | Retrieve single provider with 7-section evidence details |
| `GET` | `/api/investigations` | List all completed and draft live investigations |
| `GET` | `/api/investigations/:id` | Retrieve detailed investigation report with claims and unknowns |
| `POST` | `/api/investigations` | Launch a new live documentation investigation |
| `GET` | `/api/plans` | List all integration readiness plans with storage metadata |
| `GET` | `/api/plans/:id` | Retrieve full integration plan (tasks, CPM metrics, risks, guide) |
| `POST` | `/api/plans/generate` | Generate a new integration plan from an investigation ID |
| `PATCH` | `/api/plans/:id/tasks/:taskId` | Update task status (`pending`, `in_progress`, `completed`, `blocked`) |
| `POST` | `/api/plans/:id/regenerate-guide`| Rebuild the 14-section implementation guide from latest evidence |
| `GET` | `/api/plans/:id/export?format=md`| Export integration plan as formatted Markdown |
| `GET` | `/api/plans/:id/export?format=json`| Export integration plan as raw JSON |

---

---

## Persistence & Storage Lifecycle

### 1. Integration Plans (`data/plans.json`)
* **Storage Mechanism**: Local file-based JSON persistence located at `data/plans.json`.
* **First Launch Initialisation**: If `data/plans.json` does not exist on initial startup, `PersistentPlanStore` creates the `data/` directory, seeds the canonical Discord demonstration plan, and flushes it to disk.
* **Server Process Restart**: **Durable**. Re-reading `data/plans.json` on server boot restores all tasks, custom status updates, and CPM metrics.
* **Container Re-provisioning / Replacement**: **Ephemeral**. Like all standard containerized deployments (Google Cloud Run / Kubernetes / Docker), replacement of the host container resets the local filesystem to the container image state.
* **Export & Restoration Workflow**:
  * **Export**: Users can download plans at any time using the UI buttons or via `GET /api/plans/:id/export?format=json`.
  * **Restore**: To restore a previously exported plan on a new environment, place the JSON file at `data/plans.json` or submit it to the API.
* **Multi-Instance Concurrency**: Designed for single-instance or local developer deployments. In a multi-instance horizontally scaled cluster, a persistent shared volume or external database should be mounted.

### 2. Live Documentation Investigations
* **Storage Mechanism**: In-memory store managed by `InvestigationService`, seeded with 3 baseline records (Discord OAuth 2.0 PKCE, Stripe Connect, and Slack App Directory).
* **Server Restart**: Resets to the canonical demonstration records. For durable multi-session persistence of investigations, generate an integration plan (which persists to `data/plans.json`).

---

## Demonstration Guidance & UI Tour

1. **Dashboard (`/`)**: View aggregate readiness scores, active investigations count, and system status.
2. **App Discovery (`/discovery`)**: Filter between Linear, Notion, Gmail, and ServiceNow. Click "Compare" to view side-by-side evidence gaps without arbitrary numerical scoring.
3. **Live Investigations (`/investigations`)**: Inspect the 7-section evidence breakdown for Discord. Enter a new documentation URL (e.g. GitHub or Auth0 OAuth docs) to test live extraction.
4. **Action Planner (`/planner`)**: View the CPM critical path sequence (21h), toggle task statuses (`Completed`, `In Progress`, `Blocked`), review the Risk Register, and view the 14-section Implementation Guide.
5. **Exports**: Use "Export Markdown" or "Export JSON" in the Action Planner header to download production integration specifications.

---

## Security Architecture

- **Zero Client-Side Secrets**: No API keys, credentials, or service account files are bundled into client assets.
- **Server-Side API Proxying**: External HTTP calls and model inquiries run exclusively on the Express backend.
- **SSRF Hardening**: Strict IP pinning, private subnet rejection, and loopback guards prevent server-side request forgery during documentation fetching.
- **Error Hygiene**: Centralized Express error handler masks stack traces and raw error messages in production mode.
- **Zero Paid Services**: All persistent storage, deterministic parsing, CPM computation, and report exports operate within local resources without third-party billing.

---

## Known Limitations & Prototype Scope
- **Take-Home Prototype Scope**: Built specifically for the Composio APM Integrations evaluation. It is an evaluation prototype demonstrating real-world architecture, deterministic parsing, CPM logic, and claim-level evidence verification; not a commercial multi-tenant enterprise service.
- **Strict ₹0 Operating Budget**: Operates with zero billing requirements and zero external infrastructure costs. Optional Gemini AI features require user-provided credentials via environment variables, with 100% deterministic local fallback when omitted.
- **Rate Limits & Live Crawling**: Documentation retrieval enforces a 5MB payload limit and 10-second timeout to prevent denial-of-service and memory exhaustion.
- **Bot vs User Tokens**: Certain providers (such as Discord) document access token expiration schedules for user tokens while managing bot tokens on separate internal schedules.
- **SSRF Restrictions**: Targets resolving to private RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), AWS/GCP metadata services (`169.254.169.254`), or loopback interfaces are blocked by design.
- **Persistence Scope**: Local file persistence (`data/plans.json`) is durable across server process restarts and local container life, but resets if host containers are destroyed and re-provisioned from scratch. Permanent cross-cluster persistence requires mounting an external database or shared persistent volume.

---

## License
Apache-2.0

