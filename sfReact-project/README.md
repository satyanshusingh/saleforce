# Northstar CRM - sfReact_project

A local Salesforce-style CRM demonstration built with React and the SFCRMSIMULATOR API. It provides role-based CRM screens and CRUD operations without connecting to Salesforce or using real Salesforce credentials.

The application demonstrates:

- Role-based login for Admin, Sales Manager, Sales Representative, and Support Agent users
- Dashboard metrics and CRM activity
- Leads, accounts, contacts, opportunities, cases, and tasks
- Lead conversion into account, contact, and opportunity records
- Account management with a related-record Customer 360 view
- Stage-gated opportunity workflow with manager approval and history
- Case escalation, resolution tasks, SLA notifications, and timelines
- Field validation, record ownership, and role permissions
- Audit history and role-access visibility
- A mock Salesforce Data SDK that sends GraphQL documents to the local API

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, JavaScript ES modules, Material UI, Vite |
| Backend | Node.js simulator API |
| API | REST endpoints and a limited UI-API-style GraphQL schema |
| Data storage | Simulator-managed local JSON file |
| Package management | npm workspaces |
| Development runner | `concurrently` |

## Application architecture

```text
Browser
  |
  | React UI / Material UI
  v
Mock Salesforce Data SDK
  |
  | GraphQL over HTTP
  v
Vite development server
  |
  | /api proxy to port 4100
  v
SFCRMSIMULATOR API on port 4100
  |
  +--> GraphQL and REST endpoints
  +--> CRM validation, permissions, and automation
  |
  v
Persistent local data: SFCRMSIMULATOR/server/data/crm.json
```

## Request flow

1. The React application starts and calls `GET /api/health`.
2. The simulator loads its local CRM data and responds to the health check.
3. The login screen appears only after the simulator API is ready.
4. The selected demo role is stored in the browser and sent as the `x-demo-user` header.
5. The frontend uses the mock Data SDK from `client/src/sdk/sfDataMockSdk.js`.
6. SDK queries and mutations are POSTed to `/api/graphql` on the simulator.
7. Vite proxies `/api` requests to the simulator server.
8. The simulator's GraphQL adapter converts supported UI-API-style operations into CRM operations.
9. The simulator checks role and record ownership permissions and persists changes to its JSON data file.
10. React receives the response and refreshes the displayed list or dashboard.

## Folder structure

```text
sfReact_project/
|-- client/
|   |-- src/
|   |   |-- api/client.js             REST and demo-user request handling
|   |   |-- components/               Layout and reusable resource components
|   |   |-- data/navigation.js        Sidebar navigation
|   |   |-- data/resourceFields.js    CRM form field definitions
|   |   |-- data/userPermission.js    Demo users and role permissions
|   |   |-- pages/                   Dashboard, security, and audit screens
|   |   |-- sdk/crmService.js         CRM SDK operations
|   |   |-- sdk/operations.js         GraphQL operation builders
|   |   |-- sdk/sfDataMockSdk.js      Mock Salesforce Data SDK
|   |   |-- App.jsx                  Application state and page routing
|   |   |-- main.jsx                 Material UI theme and React entry point
|   |   `-- styles.css               Application styling
|   |-- test/                        Client unit tests
|   `-- vite.config.js               React plugin, proxy, and SDK alias
|-- server/
|   |-- database/
|   |   |-- schema.sql               Database, tables, and demo seed data
|   |   `-- relations.sql            Foreign-key constraints
|   |-- src/
|   |   |-- api.controller.js        REST routes
|   |   |-- app.module.js            NestJS module registration
|   |   |-- crm-audit.service.js     Audit and activity operations
|   |   |-- crm.service.js           CRM business logic and MySQL operations
|   |   |-- database.service.js      MySQL connection pool
|   |   |-- graphql.service.js       GraphQL schema and resolvers
|   |   |-- main.js                  Server startup
|   |   |-- model.js                 Resource, role, and field configuration
|   |   `-- record-validation.js     Create/update validation
|   `-- test/                        Server unit tests
|-- .env                             Local database and server configuration
|-- .env.example                     Configuration template
`-- package.json                     Workspace scripts
```

## Shared simulator data

The connected application reads and writes the simulator's JSON-backed data store at `SFCRMSIMULATOR/server/data/crm.json`. The separate NestJS/MySQL backend remains in this repository for standalone development, but is not used by the default connected application command.

The React app sends its GraphQL reads and CRUD mutations to the simulator, and uses the simulator's REST endpoint for lead conversion and audit/security data. The demo user IDs are aligned with the simulator so backend permissions match the role shown in the UI.

See [CRM_MODULE_DESIGN.md](./docs/CRM_MODULE_DESIGN.md) for functional requirements, user stories, entity model/ERD, API contracts, workflows, validations, acceptance criteria, test cases, and production migration notes.

## Step-by-step setup

### 1. Install prerequisites

Install:

- Node.js 20 or newer
- npm

Verify Node.js and npm:

```powershell
node --version
npm --version
```

### 2. Install dependencies

From the project root:

```powershell
npm install
```

This installs dependencies for the root, client, and server npm workspaces.
Keep `sfReact-project` beside `SFCRMSIMULATOR`; the development command starts the simulator from `../SFCRMSIMULATOR`.

### 3. Start the connected application

```powershell
npm run dev
```

This starts:

- SFCRMSIMULATOR API on `http://127.0.0.1:4100`
- Vite frontend on `http://127.0.0.1:5174`

Open `http://127.0.0.1:5174` in a browser. The React app and simulator use the same local dataset, so changes made in either interface are visible through the simulator API.

The startup screen waits for the simulator API health check. If the login screen does not appear, confirm the simulator process is running and port 4100 is available.

If the default ports are already in use, choose alternate ports in PowerShell before starting:

```powershell
$env:PORT = "4110"
$env:CRM_API_TARGET = "http://127.0.0.1:4110"
$env:CLIENT_PORT = "5175"
npm run dev
```

To run both frontends at once, open another terminal in `SFCRMSIMULATOR` and run `npm run dev`; its UI uses port 5173 while the connected React app uses 5174.

### 4. Stop the application

Press `Ctrl+C` in the terminal. `concurrently` stops both the frontend and backend processes.

## Running separate processes

Run only the original NestJS API (optional, not used by the connected app):

```powershell
npm run start:dev -w server
```

Run the connected React frontend separately (with the simulator API already running):

```powershell
npm run dev -w client
```

Start the simulator API separately from the `SFCRMSIMULATOR` folder with `npm start`.

Build the frontend:

```powershell
npm run build
```

Run tests:

```powershell
npm test -w client
npm test -w server
```

## How authorization works

This project uses a demo role-switching mechanism, not production authentication.

- The active demo user ID is sent with API requests.
- The server loads that user's role from `model.js`.
- `rolePermissions` controls CRUD operations for every CRM resource.
- Admin and manager users have broader record access.
- Sales users are restricted by ownership for some resources.
- Support users are restricted to assigned cases and owned tasks.
- Sales and support users cannot see account annual revenue.

Do not use `x-demo-user` or demo role switching as a security boundary in a deployed application.

## Simulator troubleshooting

Check the simulator API health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:4100/api/health
```

If the response is not successful:

1. Confirm Node.js is running the simulator backend from its project folder.
2. Confirm port 4100 is available.
3. Restart `npm run dev` from the sfReact-project root.
