# Al Kayan Al Arabi CRM — Implementation Roadmap

## Overview
Production CRM system for Al Kayan Al Arabi educational platform: dashboard, customers, programs, campaigns, tasks, reports, users, and goals. Built with Vanilla JS (ES6+), HTML5, CSS3, Node.js, Express.js, MongoDB, and Mongoose. Glassmorphism design with Dark/Light mode, RTL/LTR support, fully responsive.

---

## Phase 1: Foundation & Authentication
- [x] Express + MongoDB backend with JWT auth
- [x] User model with roles (admin, manager, employee) and granular permissions
- [x] Login page with i18n (AR/EN), theme toggle, RTL/LTR
- [x] Dashboard with stats, recent activity, recent programs
- [x] Shared i18n (`frontend/js/i18n.js`), theme (`frontend/js/theme.js`)

## Phase 2: Customers Module
- [x] Customer model with status, payment tracking, campaigns
- [x] Customer listing, search, filters, stats
- [x] Add/Edit/Delete customers with full payment management
- [x] Payment history (add/edit/delete) with automatic recalculation
- [x] Customer import wizard (Google Sheets / Excel / CSV)

## Phase 3: Programs Module
- [x] Program (Course) model with campaign model
- [x] Program cards, details view, statistics
- [x] Campaign management (create/edit/delete, employee assignment)
- [x] Customer assignment from campaigns, employee workload
- [x] Program import/export
- [x] Reports aggregation foundation

## Phase 4: Tasks Module

### TASK-4.1: Fix Encoding Symbols and [object Object] Text Rendering in Tasks & Sidebar
- [x] Fix mojibake symbols (mis-encoded emoji like check marks, stars, and Arabic diacritics) across sidebar icons, buttons, and program/dashboard cards
- [x] Ensure `<meta charset="UTF-8">` is strictly at the top of all HTML `<head>` tags
- [x] Set UTF-8 charset headers on all Express.js backend responses (text, HTML, JSON)
- [x] Serve frontend static files with `text/html; charset=utf-8` from Express
- [x] Fix `[object Object]` rendering in Tasks & Sidebar:
  - Add missing `tasks` and `reports` i18n sections (AR + EN)
  - Make `applyTranslation` type-safe: only string values are injected into `textContent`/`placeholder`
  - Fix translation key lookups (`t('tasks.title')` style) instead of injecting objects
  - Persist view state smoothly on tab/language switch
- **Priority:** Critical
- **Depends on:** Phase 1–3
- **Complexity:** Medium

### TASK-4.2: Tasks Data Model (Mongoose Schema) & RESTful Endpoints
- [x] `backend/models/Task.js` — title, description, assignedTo, createdBy, status, proof, relatedClients, relatedCampaign, relatedProgram, deadline, timestamps
- [x] `backend/controllers/taskController.js` — CRUD + status transitions + filters (assignedTo, status, deadline, search)
- [x] `backend/routes/tasks.js` — protected routes with role/permission guards
- [ ] Populate related entities (clients, campaign, program) in list/detail responses
- [ ] Seed sample tasks for development
- **Priority:** High
- **Depends on:** TASK-4.1
- **Complexity:** Medium

### TASK-4.3: Dynamic Tasks Board & Dynamic UI (Kanban/Cards view with quick actions)
- [x] `frontend/tasks.html` — sidebar, toolbar (add, search, employee/status/date filters), task grid
- [x] `frontend/js/tasks.js` — load, render task cards, quick status actions (Start/Complete/Reopen), add/edit/delete modals
- [x] `frontend/css/tasks.css` — glassmorphism card grid, responsive, RTL + dark mode
- [ ] Kanban board view with drag-and-drop between status columns
- [ ] Inline quick actions (change status, add proof, reassign)
- [ ] Employee task dashboard (summary counts per status)
- **Priority:** High
- **Depends on:** TASK-4.2
- **Complexity:** Medium

---

## Phase 5: Reports Module
- [x] Reports page with aggregated data from backend `/api/reports/aggregated`
- [x] Top programs, campaigns, employees, revenue, registrations over time
- [ ] Advanced report filters and date ranges
- [ ] CSV/PDF export of reports

## Phase 6: Goals & Weekly Schedule
- [ ] Goal model + endpoints
- [ ] Admin goals, employee goals, weekly schedule views
- [ ] Performance dashboard

---

## Implementation Notes
- Backend: Express + Mongoose + express-validator + JWT auth middleware
- Frontend: Vanilla JS (ES6+), CSS variables for theming
- i18n: keys in `frontend/js/i18n.js` under the appropriate module section
- Dark mode: `[data-theme="dark"]` / CSS variables
- RTL: `[dir="rtl"]` selectors
- All user-facing text must use `data-i18n` attributes
- All text responses served with `charset=utf-8` to prevent mojibake
