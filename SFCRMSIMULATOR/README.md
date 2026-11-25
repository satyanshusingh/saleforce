# CloudBridge CRM Academy — MK Academy Data SDK Edition
## Enterprise Salesforce-Style CRM Teaching Simulator (React + Node.js)

**A complete account-free CRM learning environment for React-trained developers, extended with the MK Academy Mock Data SDK Lab.**

**NEW: `Data SDK Lab (Mock)` sidebar page.** Students use `import {createDataSDK, gql} from "@salesforce/platform-sdk/data"` while Vite aliases that import to a local teaching adapter; they practice GraphQL read and Contact mutations without a Salesforce org. Start both servers, open `http://127.0.0.1:5173`, and choose Data SDK Lab (Mock). **See [`docs/MK_ACADEMY_MOCK_DATA_SDK_GUIDE.md`](docs/MK_ACADEMY_MOCK_DATA_SDK_GUIDE.md) for the full step-by-step class.**

> **IMPORTANT:** This is independently authored educational software. It is not a Salesforce org, product, or clone; it does not connect to Salesforce servers. Salesforce standard-object patterns, relationships, permission concepts, UI API-style GraphQL response shapes, and automation examples are simplified for teaching. This software has no real authentication and must never be deployed publicly or used with real customer information.

### What you will demonstrate

- **Sales Cloud:** Leads, Accounts, Contacts, Opportunities, qualification and Lead Conversion
- **Service Cloud:** Cases, priorities, service statuses and follow-up Tasks
- **Data Model:** Salesforce-style API names, field dictionary, object prefixes, lookup relationships
- **CRM CRUD:** Create, Read, Update, Delete with form validation, error handling and persisted records
- **Sales Pipeline:** Stages, stage probabilities, Kanban view, pipeline and weighted forecasting
- **Automation:** New Opportunity Task, Closed Won onboarding, high-priority Case escalation, post-conversion Task
- **Security:** Four classroom personas; object CRUD permissions; field-level masking; record ownership and sharing demonstrations
- **GraphQL:** UI API-style `uiapi { query { Contact { edges { node { ... } } } } }`, projection, `value` fields, mutation examples, variables, error responses
- **Audit:** Record creation/edit/delete/convert history and recent simulated flow runs
- **Assessments:** Six graded missions, one per four training hours

## A. Instant setup: offline preview, **no npm install required**

**Prerequisite:** Node.js 22 or higher installed on your computer. No Salesforce account, API key, database, or internet connection is needed.

1. Extract this ZIP into a folder, e.g. `C:\Training\CloudBridgeCRM` or `~/Training/CloudBridgeCRM`.
2. Open a terminal in the extracted project **root** (folder containing `package.json`).
3. Run:

   ```bash
   npm start
   ```

4. Open **http://127.0.0.1:4100** in Chrome or Edge.
5. Explore Leads, Accounts, Contacts, Opportunities, Cases, and Tasks. Switch classroom personas.

This *offline preview* is a simple read-only HTML app demonstrating the data and roles. For the **full interactive React application**, follow section B.

## B. Full React application: recommended classroom experience

**Prerequisites:** Node.js 22+, npm, and internet access **for the first installation of React and Vite dependencies**. After dependencies are installed, local operation needs no Salesforce account or online services.

**Terminal 1 — Backend**

```bash
cd Salesforce_CRM_Enterprise_Teaching_Simulator
npm start
```

**Terminal 2 — Frontend**

```bash
cd Salesforce_CRM_Enterprise_Teaching_Simulator
npm install
npm run dev
```

Navigate to **http://127.0.0.1:5173**.

> Do **not** use `npm run dev` as your only command; React proxies `/api` to the separately running Node.js backend. You need both terminals running.

**Windows PowerShell:** `cd C:\Training\Salesforce_CRM_Enterprise_Teaching_Simulator` then run the same `node`, `npm` commands. Use two PowerShell windows or VS Code terminal panes. No Unix shell scripts are required.

## C. First 15-minute instructor demo

1. Open the React dashboard. Note the total Leads, open pipeline, weighted forecast and open Cases.
2. Open **Leads**. Find **Nisha Verma — Crest Finance** (Status = Qualified).
3. Click **Convert** and confirm. Explain that Lead Conversion creates Account, Contact and optionally Opportunity.
4. Open **Accounts** and search for `Crest Finance`; then check **Contacts** and **Opportunities**.
5. Open **Tasks & Activities**: notice a welcome-call Task was created by a simulated Flow.
6. Open **Flow Automation**: inspect the Lead qualification follow-up entry.
7. Open **Audit History** as Administrator: find the conversion log.
8. Switch to **Support Agent** and try opening Leads. The backend returns a permission error.
9. Switch to **Sales Representative** and open **Accounts**: AnnualRevenue is masked; compare with Administrator.
10. Open **GraphQL Explorer**. Run `ListContacts`. Explain `uiapi`, `query`, `edges`, `node`, `value` and `data` / `errors`.

## D. Every screen explained

| Screen | Educational purpose | Exercise |
|---|---|---|
| Command Center | KPI reports and pipeline forecasting | Compare pipeline vs weighted pipeline |
| Leads | Lead qualification, conversion | Qualify and convert a prospect |
| Accounts | Organizations, owner and revenue fields | Create an Account, explore annual revenue restriction |
| Contacts | People, duplicate checking, lookup to Account | Create and edit a Contact |
| Opportunities | Stage pipeline, probability, value | Advance an Opportunity to Closed Won |
| Service Cases | Support priority and service statuses | Create a Critical Case |
| Tasks & Activities | Sales/service follow-ups | View automatically created Tasks |
| Flow Automation | Record-triggered automation simulation | Explain a Flow run and its triggering record |
| Security Studio | CRUD / sharing / field permissions | Compare Admin, Rep, Manager and Support |
| GraphQL Explorer | UI API-like queries and mutations | Run Contacts query and mutation |
| Object Manager | Salesforce-inspired metadata, fields, relationships | Identify Id, AccountId, OwnerId |
| Audit History | User actions and traceability | Inspect create, update, convert and delete |
| Student Missions | Practical evaluations | Complete six four-hour assessments |

## E. Important learning concepts

**Salesforce objects:** `Lead`, `Account`, `Contact`, `Opportunity`, `Case` and `Task` are Salesforce standard-object analogues here. In Salesforce itself these are managed through object metadata, field-level security and platform APIs.

**Relationships:** Contact.AccountId points to an Account. Opportunity.AccountId points to an Account. Case.AccountId / Case.ContactId relate Cases to customers. The local backend validates referenced IDs.

**Lead Conversion:** Our implementation requires a Lead in `Qualified` status; it creates or reuses an Account, creates a Contact, and can create an Opportunity. Actual Salesforce has additional duplicate, validation, conversion mapping, permission and record lifecycle behavior.

**Permissions:** The local server enforces a *teaching-only* role model. Any user can choose a role with the `x-demo-user` header. **This is not authentication.** Do not use this as a production security design.

**GraphQL:** `/api/graphql` implements a limited parser to demonstrate query / mutation shapes, variables, nested selection projection and errors. It is NOT a full GraphQL server, does not implement schema introspection or Salesforce runtime features, and is NOT drop-in compatible with `@salesforce/platform-sdk`.

**Automation:** The local Node.js code runs synchronous event handlers that create Task records and Flow History entries; actual Salesforce Flow Builder is separate.

## F. Development commands

| Command | Purpose |
|---|---|
| `npm start` | Run local backend and offline preview |
| `npm install` | Install React, Vite, Lucide icons for first use |
| `npm run dev` | Start full React interface |
| `npm test` | Run the backend test suite (does not need npm install) |
| `npm run build` | Compile React for production preview (after install) |
| `npm run smoke` | Check API endpoints with backend running |
| `npm run check:server` | Check backend syntax |

**Local API:** http://127.0.0.1:4100/api/health  
**Offline preview:** http://127.0.0.1:4100  
**Full React interface:** http://127.0.0.1:5173

## G. Project structure

```text
Salesforce_CRM_Enterprise_Teaching_Simulator/
├── package.json                 React dependencies and scripts
├── vite.config.js               Proxy /api to backend port 4100
├── index.html                   React entry HTML
├── src/
│   ├── main.jsx                 React bootstrap
│   ├── App.jsx                  CRM UI: 13 sections, forms, metrics, labs
│   ├── styles.css               Responsive corporate dashboard styling
│   └── lib/api.js               REST API client and classroom persona header
├── server/
│   ├── server.mjs               Node HTTP routes + offline HTML server
│   ├── engine.mjs               CRUD, ownership, validation, automation, persistence
│   ├── model.mjs                Object definitions, field metadata, roles
│   ├── seed.mjs                 CRM sample dataset
│   ├── graphql-lab.mjs          GraphQL *subset*, UI API-style response
│   ├── data/crm.json            Created at runtime; resettable sample records
│   └── public/index.html        Dependency-free read-only fallback dashboard
├── docs/
│   ├── INSTRUCTOR_24H_GUIDE.md  Detailed teaching plan and evaluations
│   ├── STUDENT_LABS.md          Click-by-click exercises + expected results
│   ├── API_REFERENCE.md         Endpoint contracts and GraphQL examples
│   ├── REAL_SALESFORCE_BRIDGE.md Transition to real Data SDK and org
│   ├── TROUBLESHOOTING.md       Common errors and fixes
│   └── CRM_API_EXAMPLES.http    VS Code REST Client examples
├── scripts/smoke.mjs            API availability checks
└── tests/server.test.mjs        Automated CRM business logic tests
```

## H. Restore sample data

In the React interface, choose **Morgan Admin** and click the reset icon in the top-right corner (confirm the dialog). This restores the original training dataset and clears audit and workflow-run history.

Alternatively use a REST client:

```bash
curl -X POST http://127.0.0.1:4100/api/reset \
  -H "Content-Type: application/json" \
  -H "x-demo-user: u1" \
  -d '{}'
```

**Persistent local storage:** Records are saved in `server/data/crm.json`; the JSON file is generated at first server startup. To preserve a class's records, copy that file before resetting.

## I. What is NOT included

- No real Salesforce login, Hyperforce org, Data SDK runtime, LWC, Apex, Salesforce Flow Builder, Agentforce, REST OAuth or production permissions
- No real GraphQL introspection, Relay pagination, UI API filters or platform transaction semantics
- No secure login: classroom role switching intentionally uses a simple HTTP header
- No production-ready rate limiting, encryption, multi-user concurrency, back-ups, audit immutability or PII handling

## J. Complete training materials

Read in this order:

1. `docs/INSTRUCTOR_24H_GUIDE.md` — six four-hour teaching blocks, talk tracks and assessment rubrics.
2. `docs/STUDENT_LABS.md` — step-by-step exercises using the running app.
3. `docs/API_REFERENCE.md` — reproduce functionality from Postman / VS Code REST Client.
4. `docs/REAL_SALESFORCE_BRIDGE.md` — important differences and how to move to an org later.
5. `docs/TROUBLESHOOTING.md` — setup and usage issues.
6. `docs/CODE_WALKTHROUGH.md` — explained React, CRUD, security and GraphQL source-code examples.

**Official source concepts:**
- Salesforce data model: https://trailhead.salesforce.com/content/learn/modules/data_modeling
- Salesforce Leads and Opportunities: https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience
- Salesforce GraphQL guide: https://developer.salesforce.com/docs/platform/graphql/guide/query-record-objects.html
- Salesforce Multi-Framework: https://developer.salesforce.com/docs/platform/multiframework/guide/mfw-get-started.html

**Classroom guarantee:** Students can explore the offline preview with only Node.js. For the full React UI, npm dependencies must be installed once. No Salesforce org, external API or paid account is needed.

## K. Optional one-command instructor storyline

With the backend already running, run `node scripts/classroom-scenario.mjs` from the project root. It creates a Qualified Lead, converts it, closes its Opportunity as Won, creates a Critical Case, and prints the linked IDs and Task/Flow outcomes. It uses a unique example company name on each run and never resets students' existing records.
