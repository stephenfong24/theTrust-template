# Trust Fund Management System

## Project Overview

Trust Fund Management System is a React TypeScript enterprise UI for client review of trust fund management workflows, branding, navigation, forms, tables, dashboards, role access and page flow.

## Technology Stack

React, TypeScript, Vite, React Router, Tailwind CSS, Lucide React, React Hook Form, Zod, Recharts, Sonner, date-fns and clsx.

## Installation

```bash
npm install
npm run dev
```

## Login Credentials

Username: superadmin  
Password: Trust@123

## Local Authentication

Authentication is frontend-only. User records are loaded from `src/data/users.json`, validated in `src/services/authService.ts`, and stored as a local session under `trust-fund-session` without saving the password.

## Local Data

Initial records live in `src/data`. Temporary create, update and delete actions use localStorage keys such as `trust-fund-applications`, `trust-fund-tasks`, `trust-fund-notifications`, `trust-fund-permissions` and `trust-fund-settings`.

## Role Access

Roles and permissions are configured in `src/config/roles.ts` and `src/config/permissions.ts`. Navigation filtering is configured in `src/config/navigation.ts`, while protected route checks and button-level guards are handled by shared security components and hooks.

## Adding Users

Add users to `src/data/users.json` with an id, username, password, name, email, role and ACTIVE status. New role identifiers should match the role configuration.

## Adding Roles

Add the role identifier in `src/config/roles.ts`, define its permissions in `src/config/permissions.ts`, then connect visible navigation items in `src/config/navigation.ts`.

## Replacing Local Services

The local authentication and data access logic is isolated in `src/services`. Replace those methods with API calls when production services are ready, keeping component contracts stable.

## Project Structure

`src/components` contains shared UI, `src/config` contains navigation and access settings, `src/context` contains session state, `src/data` contains local records, `src/pages` contains routed views, `src/routes` contains route protection and route mapping, and `src/services` contains local service logic.

## Available Routes

The application includes dashboard, applications, trust management, clients, agents, payments, accounts, tasks, documents, reports, users, roles, administration, audit, profile, preferences, notifications, access denied and not found routes.

## Production Considerations

Before production use, replace local storage, local authentication, fictional records, simulated validation and frontend-only access checks with secured backend services, database persistence, server authorization, complete audit logging, encryption, external integrations and tested business rules.
