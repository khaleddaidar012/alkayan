# Programs Module — Implementation Roadmap

## Overview
Build the Programs module for Al Kayan Al Arabi CRM: card-based listing, detail view with statistics, marketing campaigns, customer assignment, employee distribution, and permissions.

---

## Phase 1: Backend Foundation

### 1.1 Update Course/Program Model
- [x] Extend `backend/models/Course.js` to include:
  - [x] `name` (String, required)
  - [x] `description` (String)
  - [x] `price` (Number)
  - [x] `duration` (String) — e.g. "3 months"
  - [x] `instructor` (String)
  - [x] `startDate` (Date)
  - [x] `endDate` (Date)
  - [x] `capacity` (Number)
  - [x] `status` (enum: active, completed, cancelled, draft)
  - [x] `image` (String, default '')
  - [x] `pre('save')` hook syncs name/title and capacity/maxStudents
- **Priority:** High
- **Depends on:** Nothing
- **Complexity:** Easy

### 1.2 Create Campaign Model
- [x] Create `backend/models/Campaign.js` with fields:
  - [x] `name` (String, required)
  - [x] `program` (ObjectId ref to Course)
  - [x] `status` (enum: active, completed, paused, cancelled)
  - [x] `startDate` (Date)
  - [x] `endDate` (Date)
  - [x] `budget` (Number)
  - [x] `leadsCount` (Number)
  - [x] `registeredCustomers` (Number)
  - [x] `conversionRate` (Number)
  - [x] `assignedEmployees` ([ObjectId] ref to User)
  - [x] `customers` ([ObjectId] ref to Customer)
  - [x] `notes` (String)
  - [x] `timestamps: true`
- **Priority:** High
- **Depends on:** 1.1
- **Complexity:** Medium

### 1.3 Create Campaign Controller
- [x] Create `backend/controllers/campaignController.js`
- [x] `getCampaigns` — list with filters (program, status, date range)
- [x] `getCampaign` — single by ID with populated employees, customers, program
- [x] `createCampaign` — manager+ only
- [x] `updateCampaign` — manager+ only
- [x] `deleteCampaign` — manager+ only
- **Priority:** High
- **Depends on:** 1.2
- **Complexity:** Medium

### 1.4 Create Campaign Routes
- [x] Create `backend/routes/campaigns.js`
- [x] `GET /api/campaigns`
- [x] `GET /api/campaigns/:id`
- [x] `POST /api/campaigns` (manager+)
- [x] `PUT /api/campaigns/:id` (manager+)
- [x] `DELETE /api/campaigns/:id` (manager+)
- [x] Wire protect + authorize middleware
- **Priority:** High
- **Depends on:** 1.3
- **Complexity:** Easy

### 1.5 Create Program Statistics Controller
- [x] Create `backend/controllers/programStatsController.js`
- [x] `GET /api/programs/:id/stats` — returns:
  - activeCustomers, totalCustomers, potentialCustomers, rejectedCustomers
  - totalCampaigns, activeCampaigns, finishedCampaigns
  - expectedRevenue, collectedRevenue, remainingPayments
- [x] Uses MongoDB aggregation for efficient computation
- **Priority:** Medium
- **Depends on:** 1.1, Campaign model
- **Complexity:** Medium

### 1.6 Create Program CRUD Controller
- [x] Create `backend/controllers/programController.js`
- [x] `getPrograms` — list with filters + summary counts per program
- [x] `getProgram` — single by ID with full stats
- [x] `createProgram` — manager+ only
- [x] `updateProgram` — manager+ only
- [x] `deleteProgram` — admin only
- **Priority:** High
- **Depends on:** 1.1
- **Complexity:** Medium

### 1.7 Create Program Routes
- [x] Create `backend/routes/programs.js`
- [x] `GET /api/programs`
- [x] `GET /api/programs/:id`
- [x] `GET /api/programs/:id/stats`
- [x] `POST /api/programs` (manager+)
- [x] `PUT /api/programs/:id` (manager+)
- [x] `DELETE /api/programs/:id` (admin only)
- [x] Wire protect + authorize middleware
- **Priority:** High
- **Depends on:** 1.6
- **Complexity:** Easy

### 1.8 Register Routes in Server
- [x] Add `app.use('/api/programs', ...)` to `server.js`
- [x] Add `app.use('/api/campaigns', ...)` to `server.js`
- **Priority:** High
- **Depends on:** 1.4, 1.7
- **Complexity:** Easy

---

## Phase 2: Programs Listing Page

### 2.1 Create Programs HTML Page
- [x] Create `frontend/programs.html`
- [x] Sidebar with Programs active
- [x] Header with lang/theme/logout
- [x] Toolbar: search + Add Program button
- [x] Stats bar (total, active, enrollments, campaigns)
- [x] Filter bar (status dropdown)
- [x] Card grid container
- [x] Empty state + Error state
- [x] Details view container (hidden)
- [x] Add Program modal + Delete modal
- **Priority:** High
- **Depends on:** 1.8
- **Complexity:** Easy

### 2.2 Create Programs CSS
- [x] Create `frontend/css/programs.css`
- [x] Program card design:
  - Image/placeholder
  - Program name
  - Status badge
  - Active customers count, total enrollments, active campaigns count
  - Last updated
- [x] Card grid (responsive: 3 cols → 2 cols → 1 col)
- [x] Quick action buttons on hover
- [x] Program details view styling (info grid, stats grid, campaign cards)
- [x] RTL + dark mode
- **Priority:** High
- **Depends on:** 2.1
- **Complexity:** Medium

### 2.3 Create Programs JS — Data Loading
- [x] Create `frontend/js/programs.js`
- [x] Auth guard (getUser, getToken, redirectToLogin)
- [x] `loadPrograms()` — fetch from `GET /api/programs`
- [x] Cache `allPrograms` list
- [x] Skeleton loading + error handling
- [x] Stats rendering from loaded data
- [x] Search + status filter (debounced)
- [x] Basic card rendering (in preparation for Task 2.4)
- [x] Sidebar, header, lang/theme/logout wiring
- [x] Initial render on DOMContentLoaded
- **Priority:** High
- **Depends on:** 1.8, 2.1
- **Complexity:** Easy

### 2.4 Implement Card Rendering
- [x] `renderPrograms()` — build card HTML
- [x] Each card: image placeholder, name, status, customers count, campaigns count, revenue, date
- [x] Status color mapping: active → green, completed → gray, cancelled → red, draft → gold
- [x] Quick action buttons: View Details, Add Customer, Create Campaign, Edit, Delete
- [x] Instructor + duration meta on card
- [x] Empty state
- [x] Click card → navigate to details
- **Priority:** High
- **Depends on:** 2.3
- **Complexity:** Medium

### 2.5 Implement Search & Filters
- [x] Search by name/instructor (debounce 300ms)
- [x] Status filter dropdown
- [x] Combine search + filters
- **Priority:** Medium
- **Depends on:** 2.4
- **Complexity:** Easy

### 2.6 Add Program Modal
- [x] Button → modal with form fields:
  - Name, Description, Price, Duration, Instructor
  - Start Date, End Date, Capacity, Status
- [x] Form validation (name required)
- [x] Submit → POST /api/programs → reload
- [x] Edit mode → pre-populate → PUT /api/programs/:id → reload
- [x] Modal close on backdrop click + ESC
- **Priority:** High
- **Depends on:** 2.4
- **Complexity:** Medium

---

## Phase 3: Program Details Page

### 3.1 Create Program Details HTML (same page, different view)
- [x] Details container in `programs.html` (hidden by default)
- [x] Back button → hideProgramDetails()
- [x] Program Info section (name, price, duration, instructor, dates, capacity, status, description)
- [x] Statistics section (10 stat cards: customers by status, revenue, campaigns)
- [x] Campaigns section (campaign cards with status, dates, leads, conversion, employees)
- [x] Revenue stats from `/api/programs/:id/stats`
- [x] Edit/Delete buttons in details header
- **Priority:** High
- **Depends on:** 2.1
- **Complexity:** Medium

### 3.2 Implement Details View Logic
- [x] `showProgramDetails(id)` — fetch from GET /api/programs/:id + stats
- [x] Back button → hideProgramDetails() — restore grid
- [x] Edit/Delete buttons in header
- **Priority:** High
- **Depends on:** 3.1, 2.4
- **Complexity:** Easy

### 3.3 Program Info Section
- [x] Display: name, description, price, duration, instructor
- [x] Start date, end date, capacity, status badge
- **Priority:** High
- **Depends on:** 3.2
- **Complexity:** Easy

### 3.4 Statistics Section
- [x] Dashboard-style stat cards:
  - Active customers, total customers, potential, rejected
  - Total campaigns, active, finished
  - Expected revenue, collected, remaining
- [x] Fetch from `GET /api/programs/:id/stats`
- **Priority:** Medium
- **Depends on:** 3.2
- **Complexity:** Medium

### 3.5 Campaigns Section in Program Details
- [x] Display campaigns as cards
- [x] Each card: name, status badge, start/end date
- [x] Leads count, registered customers, conversion rate
- [x] Assigned employees
- [x] Quick actions: View, Edit, Delete
- **Priority:** High
- **Depends on:** 3.2
- **Complexity:** Medium

---

## Phase 4: Campaign Management

### 4.1 Create Campaign Details HTML
- [x] Campaign details view (same page, hidden by default)
- [x] Back button → returns to program details
- [x] Campaign Info section (name, program, dates, budget, status)
- [x] Statistics section (leads, registered customers, conversion rate, budget)
- [x] Assigned Employees section (avatar badges)
- [x] Customers section (cards with status, phone, whatsapp, employee, payment)
- [x] Notes section
- **Priority:** High
- **Depends on:** 3.5
- **Complexity:** Medium

### 4.2 Campaign Info Section
- [x] Name, status, start/end date, budget, program
- [x] Assigned employees list
- **Priority:** High
- **Depends on:** 4.1
- **Complexity:** Easy

### 4.3 Campaign Statistics
- [x] Stat cards: leads, registered, conversion rate, budget
- **Priority:** Medium
- **Depends on:** 4.1
- **Complexity:** Easy

### 4.4 Customers in Campaign
- [x] Display customers as cards inside campaign
- [x] Name, phone, whatsapp, status, assigned employee
- [x] Registration date, payment status
- **Priority:** High
- **Depends on:** 4.1
- **Complexity:** Medium

### 4.5 Add Customer from Campaign
- [x] Add Customer button in campaign view
- [x] Modal with customer fields (name, phone, whatsapp, email, employee, status, date, notes)
- [x] Auto-set: program (from campaign), registrationDate (today)
- [x] Employee dropdown populated from /api/users
- [x] Submit → POST /api/customers → reload campaign details
- **Priority:** High
- **Depends on:** 4.4
- **Complexity:** Medium

### 4.6 Add Customer from Program
- [x] Add Customer button in program details header
- [x] Same modal reused from 4.5, auto-set program
- **Priority:** Medium
- **Depends on:** 3.5
- **Complexity:** Medium

### 4.7 Create Campaign Modal
- [x] Modal with fields: name, program (auto-set), start/end date, budget, notes
- [x] Employee assignment (multi-select checkboxes from /api/users)
- [x] Status dropdown
- [x] Form validation (name, dates required)
- [x] Submit → POST /api/campaigns → reload program details
- **Priority:** High
- **Depends on:** 4.1
- **Complexity:** Medium

### 4.8 Edit Campaign
- [x] Reuse create modal in edit mode
- [x] Pre-populate fields (name, dates, budget, status, notes, employees)
- [x] Save → PUT /api/campaigns/:id → reload program details
- **Priority:** Medium
- **Depends on:** 4.7
- **Complexity:** Medium

### 4.9 Delete Campaign
- [x] Delete button on campaign card (manager+)
- [x] Confirmation modal with name (reuses program delete modal)
- [x] DELETE /api/campaigns/:id → reload program details
- **Priority:** Medium
- **Depends on:** 4.8
- **Complexity:** Easy

---

## Phase 5: Employee Distribution

### 5.1 Employee Workload View
- [x] Section in program details showing employee distribution
- [x] Per employee: name, campaigns count (total/active), assigned customers, subscribed/potential
- [x] Conversion rate with color coding
- **Priority:** Medium
- **Depends on:** 3.4
- **Complexity:** Medium

### 5.2 Assign Customers to Employees
- [x] Customers list in program details with inline employee dropdown per customer
- [x] Change employee via dropdown → PUT /api/customers/:id
- [x] Success toast + rollback on failure
- **Priority:** Low
- **Depends on:** 5.1
- **Complexity:** Medium

---

## Phase 6: i18n

### 6.1 Add Programs Translations
- [x] Add `programs` section to `i18n.js` (AR + EN)
- [x] Keys: module name, page title, statuses, form labels
- [x] Campaign-related keys
- [x] Stat labels, buttons, empty states
- [x] Wired into `switchLang()` for language toggle
- **Priority:** Medium
- **Depends on:** 2.1
- **Complexity:** Easy

### 6.2 Wire i18n to Programs Page
- [x] `initI18n('programs', 'programs')` on page load
- [x] `data-i18n` attributes on all static text
- [x] Added missing keys to programs i18n section: addCustomer, assignedEmployee, customerCreated, noCustomers, paused, subscribed, potential, thinking, noResponse, rejected, whatsapp, email, contactSection, registrationSection, notesSection, registrationDate, filterStatus
- **Priority:** Medium
- **Depends on:** 6.1
- **Complexity:** Easy

---

## Phase 7: Permissions & Navigation

### 7.1 Frontend Permission Checks
- [x] `can(module, action)` + `canManageCampaigns()` helpers
- [x] Hide Delete button for non-admin/non-manager
- [x] Hide campaign create buttons for employees
- [x] Hide Add Program button for employees
- [x] Conditionally render all action buttons based on role/permissions
- **Priority:** High
- **Depends on:** 2.4
- **Complexity:** Easy

### 7.2 Backend Permission Enforcement
- [ ] `authorize` middleware on all routes
- [ ] Employee: view only, add customer
- [ ] Manager: create/edit/delete campaigns
- [ ] Admin: full access
- **Priority:** High
- **Depends on:** 1.4, 1.7
- **Complexity:** Easy

### 7.3 Add Programs Link to Sidebar
- [x] Add `data-nav="programs"` to sidebar in all pages
- [x] Ensure navigation works
- **Priority:** Medium
- **Depends on:** 2.1
- **Complexity:** Easy

---

## Phase 8: Import & Export

### 8.1 Programs Import
- [x] Add `programs` config to import controller (name, description, price, duration, instructor, startDate, endDate, capacity, status fields)
- [x] Import wizard supports `?collection=programs` URL parameter
- [x] Import button on programs page → navigates to import wizard with collection=programs
- **Priority:** Low
- **Depends on:** Import Wizard, 1.6
- **Complexity:** Medium

### 8.2 Export Programs
- [x] Backend: GET /api/programs/export → enriched data (name, price, instructor, dates, capacity, customers, campaigns, revenue)
- [x] Frontend: Export button → fetches data, generates CSV, triggers download
- **Priority:** Low
- **Depends on:** 3.4
- **Complexity:** Medium

---

## Phase 9: Reports Foundation

### 9.1 Prepare Aggregation Pipeline
- [x] Backend `GET /api/reports/aggregated` with:
  - Top programs by enrollments/revenue
  - Top campaigns by conversion rate
  - Top employees by conversion rate
  - Revenue by program
  - Registrations over time (last 12 months)
  - Campaign ROI
- **Priority:** Low
- **Depends on:** 1.5
- **Complexity:** Hard

### 9.2 Programs Stats Cards (Polish)
- [x] `renderStatCards()` helper — handles empty values & locale formatting
- [x] Async stats loading — page renders immediately, revenue stats update when ready
- [x] Skeleton CSS for stat cards (`.stat-skeleton`)
- [x] Responsive grid (auto-fill minmax, breakpoints for 768px & 480px)
- **Priority:** Low
- **Depends on:** 3.4
- **Complexity:** Easy

---

## Implementation Order Summary

| # | Task | Phase | Complexity |
|---|------|-------|------------|
| 1 | 1.1 — Update Program Model | Backend | Easy | ✅ |
| 2 | 1.2 — Create Campaign Model | Backend | Medium | ✅ |
| 3 | 1.6 — Create Program Controller | Backend | Medium | ✅ |
| 4 | 1.7 — Create Program Routes | Backend | Easy | ✅ |
| 5 | 1.3 — Create Campaign Controller | Backend | Medium | ✅ |
| 6 | 1.4 — Create Campaign Routes | Backend | Easy | ✅ |
| 7 | 1.5 — Program Stats Controller | Backend | Medium | ✅ |
| 8 | 1.8 — Register Routes in Server | Backend | Easy | ✅ |
| 9 | 2.1 — Create Programs HTML | Frontend | Easy | ✅ |
| 10 | 2.2 — Create Programs CSS | Frontend | Medium | ✅ |
| 11 | 6.1 — Add i18n Translations | Frontend | Easy | ✅ |
| 12 | 2.3 — JS Data Loading | Frontend | Easy | ✅ |
| 13 | 2.4 — Card Rendering | Frontend | Medium | ✅ |
| 14 | 2.5 — Search & Filters | Frontend | Easy | ✅ |
| 15 | 7.1 — Frontend Permissions | Frontend | Easy | ✅ |
| 16 | 2.6 — Add Program Modal | Frontend | Medium | ✅ |
| 17 | 3.1 — Details HTML | Frontend | Medium | ✅ |
| 18 | 3.3 — Details CSS | Frontend | Medium | ✅ |
| 19 | 3.2 — Details View Logic | Frontend | Easy | ✅ |
| 20 | 3.3 — Program Info Section | Frontend | Easy | ✅ |
| 21 | 3.4 — Statistics Section | Frontend | Medium | ✅ |
| 22 | 3.5 — Campaigns Section | Frontend | Medium | ✅ |
| 23 | 4.1 — Campaign Details HTML | Frontend | Medium | ✅ |
| 24 | 4.2 — Campaign Info Section | Frontend | Easy | ✅ |
| 25 | 4.3 — Campaign Statistics | Frontend | Easy | ✅ |
| 26 | 4.4 — Customers in Campaign | Frontend | Medium | ✅ |
| 27 | 4.5 — Add Customer from Campaign | Frontend | Medium | ✅ |
| 28 | 4.6 — Add Customer from Program | Frontend | Medium | ✅ |
| 29 | 4.7 — Create Campaign Modal | Frontend | Medium | ✅ |
| 30 | 4.8 — Edit Campaign | Frontend | Medium | ✅ |
| 31 | 4.9 — Delete Campaign | Frontend | Easy | ✅ |
| 32 | 5.1 — Employee Workload View | Frontend | Medium | ✅ |
| 33 | 5.2 — Assign Customers | Frontend | Medium | ✅ |
| 34 | 6.2 — Wire i18n | Frontend | Easy | ✅ |
| 35 | 7.2 — Backend Permissions | Backend | Easy | ✅ |
| 36 | 7.3 — Sidebar Navigation | Frontend | Easy | ✅ |
| 37 | 8.1 — Programs Import | Backend | Medium | ✅ |
| 38 | 8.2 — Export Programs | Frontend | Medium | ✅ |
| 39 | 9.1 — Aggregation Pipeline | Backend | Hard | ✅ |
| 40 | 9.2 — Stats Polish | Frontend | Easy | ✅ |

---

**Total: 40 tasks** — all completed ✅

---

## Implementation Notes for opencode

### Last completed tasks
**Task 7 — 1.5 Program Stats Controller** (`backend/controllers/programStatsController.js`)
- Implementing agent: opencode
- Date: 2026-07-25
- Uses MongoDB aggregation pipeline for customer counts, payment totals, and campaign counts
- Wired to `GET /api/programs/:id/stats` in routes

### Phase 4 complete! All campaign tasks done (4.1–4.9)
### Phase 7 complete! All permissions & navigation tasks done (7.1–7.3)
### Next task to implement
**Task 37 — 8.1 Programs Import**
- CSV/Excel import for programs
- Backend endpoint: POST /api/programs/import

### Files already created
| File | Purpose |
|------|---------|
| `backend/models/Course.js` | Updated with name, duration, capacity, image + pre-save hook |
| `backend/models/Campaign.js` | Full campaign schema with refs to Course, User, Customer |
| `backend/controllers/programController.js` | CRUD + enriched stats |
| `backend/routes/programs.js` | Program CRUD routes with auth middleware |
| `backend/controllers/campaignController.js` | Campaign CRUD with filters + population |
| `backend/routes/campaigns.js` | Campaign CRUD routes with auth middleware |
| `backend/controllers/programStatsController.js` | Aggregated program statistics via MongoDB pipeline |

### Execution order
Always follow the Implementation Order Summary table above. Implement exactly one task per user command. The user will say the task number (e.g. "4" for task 4, "5" for task 5, etc.).

### Code conventions
- Backend: Express + Mongoose + express-validator + JWT auth middleware
- Frontend: Vanilla JS + CSS variables for theming
- i18n: Keys in `frontend/js/i18n.js` under the appropriate module section
- Dark mode: `[data-theme="dark"]` / CSS variables
- RTL: `[dir="rtl"]` selectors
- All user-facing text must use `data-i18n` attributes

---