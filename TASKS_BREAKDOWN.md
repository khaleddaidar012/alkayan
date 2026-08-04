# Tasks Management System - TASKS_BREAKDOWN

## Main Goal
Implement the full Tasks Management System described in `new_feature.md`: admins/managers create tasks, assign them to employees, link customers/campaigns/programs, set deadlines, track goals, and employees view their tasks, update status, and submit proof of completion.

## Branch / Isolation Rules
- Work ONLY on branch `feature/tasks-management`.
- Do NOT modify or commit to `main` (kept as reference/backup).
- Commit after each small task with a clear message.
- Update statuses below as tasks complete.

---

## Tasks

### Task 1 - Feature documentation
- **Status:** Done
- **Description:** Create `docs/tasks-feature.md` documenting the feature overview, API endpoints, and how to use it.
- **Related files:** `docs/tasks-feature.md` (new)

### Task 2 - Verify existing Task backend
- **Status:** Done
- **Description:** Verify `backend/models/Task.js`, `backend/controllers/taskController.js`, `backend/routes/tasks.js` and server wiring cover create/list/update/delete/status-update/proof requirements from new_feature.md. Fix gaps if any.
- **Related files:** `backend/models/Task.js`, `backend/controllers/taskController.js`, `backend/routes/tasks.js`, `backend/server.js`

### Task 3 - Verify existing Goal backend
- **Status:** Done
- **Description:** Verify `backend/models/Goal.js`, `backend/controllers/goalController.js`, `backend/routes/goals.js` and server wiring cover goal CRUD + progress tracking. Fix gaps if any.
- **Related files:** `backend/models/Goal.js`, `backend/controllers/goalController.js`, `backend/routes/goals.js`, `backend/server.js`

### Task 4 - Verify admin Tasks frontend
- **Status:** Pending
- **Description:** Verify `frontend/tasks.html` + `frontend/js/tasks.js` fully implement the admin task creation/assignment/list screens. Fix gaps if any.
- **Related files:** `frontend/tasks.html`, `frontend/js/tasks.js`

### Task 5 - Verify employee Tasks frontend
- **Status:** Pending
- **Description:** Verify `frontend/employee-tasks.html` + `frontend/js/employee-tasks.js` implement employee task view, status update, and proof submission. Fix gaps if any.
- **Related files:** `frontend/employee-tasks.html`, `frontend/js/employee-tasks.js`

### Task 6 - Admin Goals frontend
- **Status:** Pending
- **Description:** Create missing `frontend/js/admin-goals.js` (referenced by `frontend/admin-goals.html`) implementing goal CRUD + progress UI.
- **Related files:** `frontend/admin-goals.html`, `frontend/js/admin-goals.js` (new)

### Task 7 - Admin Performance Dashboard
- **Status:** Pending
- **Description:** Create missing `frontend/js/admin-performance-dashboard.js` (referenced by `frontend/admin-performance-dashboard.html`).
- **Related files:** `frontend/admin-performance-dashboard.html`, `frontend/js/admin-performance-dashboard.js` (new)

### Task 8 - Employee Weekly Schedule
- **Status:** Pending
- **Description:** Create missing `frontend/js/employee-weekly-schedule.js` (referenced by `frontend/employee-weekly-schedule.html`).
- **Related files:** `frontend/employee-weekly-schedule.html`, `frontend/js/employee-weekly-schedule.js` (new)

### Task 9 - Verify employee Goals frontend
- **Status:** Pending
- **Description:** Verify `frontend/employee-goals.html` + `frontend/js/employee-goals.js` fully implement employee goal tracking. Fix gaps if any.
- **Related files:** `frontend/employee-goals.html`, `frontend/js/employee-goals.js`

### Task 10 - Cleanup stray file
- **Status:** Pending
- **Description:** Remove stray empty root-level `js/employee-tasks.js` (0 bytes) if confirmed unused by any page.
- **Related files:** `js/employee-tasks.js` (delete candidate)

### Task 11 - Integration & polish
- **Status:** Pending
- **Description:** Wire sidebar navigation links for all tasks/goals pages, ensure i18n and theme compatibility, verify end-to-end flows and run the app.
- **Related files:** all feature HTML + JS files

---

## Progress Summary
- Completed: 3 / 11
