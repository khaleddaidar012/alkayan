# TASKS4.md — QA + Mobile Optimization + Responsive + Deployment Phase

## App Scope (analyzed from actual codebase)

**Project:** Al Kayan Al Arabi CRM — educational institute CRM (Express + Mongoose backend, vanilla HTML/CSS/JS frontend, AR/EN i18n, dark/light themes).

**Actual modules (NOT a "Spark Engineering ERP" — there are no Projects/Materials/Contractors/Suppliers/Finance modules):**
1. Auth (login/logout/remember-me/session)
2. Dashboard (stats, navigation)
3. Customers (cards, details, edit, payments, statuses, communications, messages, import)
4. Programs + Campaigns (CRUD, pricing per country)
5. Pricing settings
6. Payment Methods settings
7. Communication Types settings
8. Customer Statuses settings + history
9. Webhook Logs (WhatsApp/n8n)
10. Reports
11. Tasks (admin) + Employee Tasks
12. Goals (admin) + Employee Goals
13. Weekly Schedules (admin) + Employee Schedules
14. Admin Performance Dashboard
15. Users & roles

**Frontend files:** 21 HTML pages + `frontend/js/` (18 scripts incl. i18n.js, theme.js) + `frontend/css/` (17 stylesheets).

**Backend:** Express + Mongoose on MongoDB Atlas, JWT auth, 65 passing unit tests.

**Current mobile responsiveness gaps (pre-audit):**
- CSS files with **zero** `@media` queries: `admin-goals.css`, `admin-performance-dashboard.css`, `admin-weekly-schedule.css`, `employee-goals.css`, `employee-tasks.css`, `employee-weekly-schedule.css`, `payment-methods.css`
- CSS files with partial breakpoints: `dashboard.css` (1024/768/480), `customers.css` (9), `programs.css` (11), `users.css`, `tasks.css`, `reports.css`, `login.css`, `pricing.css`, `customers-import.css`
- No bottom navigation on mobile; hamburger-based drawer only (dashboard.css)
- Settings pages (`payment-methods.html`, `communication-types.html`, `customer-statuses.html`, `webhook-logs.html`) share `payment-methods.css` which has no mobile breakpoints
- Touch-target sizes, tables, modals, filters, forms need mobile audit

**Rules of this phase (from brief):**
- Do not rewrite the app. Do not change working business logic unless a bug is found.
- Do not modify unrelated modules. Preserve AR/EN, RTL/LTR, dark/light, mobile/tablet/desktop.
- Do not remove functionality. Simplicity > visual complexity. No unnecessary animations.
- Every discovered issue becomes a task. Nothing is marked `[x]` until implemented AND tested.
- Keep the app working after every major phase. Commit + push per major phase (see COMMIT_TRACKING.md).

**Legend:** `[ ]` pending · `[~]` in progress · `[x]` done (implemented + tested)

---

## Phase 0 — Project Analysis & Task File
> Analysis completed during planning; no code changes.

### Task 0.1 — Analyze project structure and modules
- [x] Inventory frontend pages, JS, CSS and backend models/routes/controllers/tests
- [x] Identify mobile breakpoint coverage per stylesheet (gap list above)
- [x] Confirm scope vs generic brief (Spark ERP terms do not apply; map phases to real modules)

### Task 0.2 — Create TASKS4.md + COMMIT_TRACKING.md
- [x] Create `TASKS4.md` (this file) with the complete phase/task breakdown
- [ ] Create `COMMIT_TRACKING.md` (commit log for this phase)

---

## Phase 1 — Mobile Responsiveness Implementation
> Make the whole app responsive like a native app on small/large phones, tablets, desktop, large desktop. No horizontal scroll. Comfortable touch targets. One-hand friendly inputs/forms.

### Task 1.1 — Shared mobile foundation
- [ ] Add a shared mobile media-query layer (viewport-safe breakpoints 1200/1024/768/480) in `style.css` (or new `css/mobile.css` loaded by all pages)
- [ ] Set sensible minimum touch target (≈44px) for buttons, nav items, action buttons, inputs
- [ ] Prevent horizontal overflow globally (`overflow-x` guard) and fix any fixed-width offenders
- [ ] Test at 360×640, 412×915, 768×1024, 1280×800, 1920×1080 (Playwright)

### Task 1.2 — Mobile navigation & sidebar
- [ ] Audit/improve hamburger drawer behavior on all dashboard pages (consistency)
- [ ] Ensure drawer closes on nav click, backdrop tap, and Escape
- [ ] Add a compact mobile bottom navigation (Dashboard, Customers, Programs, Reports, Tasks) with safe-area padding, active state, and i18n/theme compatibility
- [ ] Ensure header (lang/theme/logout) wraps cleanly on small screens without overflow
- [ ] Test navigation on all viewports, AR + EN, dark + light

### Task 1.3 — Dashboard mobile
- [ ] Stack stat cards nicely (2-col → 1-col) with adequate touch targets
- [ ] Make quick-action buttons full-width-ish and easy to tap
- [ ] Ensure activity list, recent programs, and header fit without horizontal scroll
- [ ] Test all viewports, AR + EN

### Task 1.4 — Customers mobile (largest module)
- [ ] Customer cards: single-column, readable spacing, status badge + WhatsApp + details buttons touch-friendly
- [ ] Customer details view: sections stack, no horizontal scroll; sticky action bar on mobile
- [ ] Search + filters usable one-hand; filter bar wraps
- [ ] Add/Edit customer modal fits mobile viewport (scrollable body, sticky footer, safe-area)
- [ ] Payment summary/history table → responsive (card-like rows or horizontal scroll within a constrained box)
- [ ] Status dropdown + history timeline usable on touch
- [ ] Communications log + message slider usable on touch
- [ ] Customers import page: steps, template download, file input, preview table responsive
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.5 — Programs & Campaigns mobile
- [ ] Program cards grid stacks to 1-col on phones
- [ ] Program details + pricing display responsive
- [ ] Campaigns list/details + add-customer modal responsive
- [ ] Country pricing inputs usable on touch
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.6 — Settings pages mobile (payment-methods.css family)
- [ ] Payment Methods page responsive (toolbar, table, add modal)
- [ ] Communication Types page responsive
- [ ] Customer Statuses page responsive (color inputs, sort, modal)
- [ ] Webhook Logs page responsive (filters, table, detail modal, pagination, reprocess)
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.7 — Tasks & Goals mobile
- [ ] Admin tasks page responsive (filters, kanban/list, create modal)
- [ ] Employee tasks page responsive (status updates, proof submission)
- [ ] Admin goals page responsive (cards, progress, modal)
- [ ] Employee goals page responsive
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.8 — Schedules & Performance Dashboard mobile
- [ ] Admin weekly schedule responsive (weekly grid/timeline)
- [ ] Employee weekly schedule responsive
- [ ] Admin performance dashboard responsive (charts/cards/tables)
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.9 — Users, Reports, Pricing, Login mobile
- [ ] Users page responsive (table → stacked rows, modal)
- [ ] Reports page responsive (filters, tables, export)
- [ ] Pricing settings responsive
- [ ] Login page mobile-friendly (already has 480 breakpoint — verify full)
- [ ] Test all viewports, AR + EN, dark + light

### Task 1.10 — Mobile navigation/regression sanity test
- [ ] End-to-end mobile walkthrough of the 5 primary flows (login → customers → program → payment → report)
- [ ] Verify no horizontal scrolling anywhere on 360×640
- [ ] Verify touch targets ≥44px on primary actions
- [ ] Verify dark/light + AR/EN on mobile

**Phase 1 commit:** `Improve mobile responsiveness` → push. Update COMMIT_TRACKING.md.

---

## Phase 2 — Mobile UI/UX Audit (report only, no code fixes yet)

### Task 2.1 — Audit methodology
- [ ] Define checklist: layout, spacing, typography, RTL/LTR, navigation, sidebar, buttons, icons, forms, modals, bottom sheets, dropdowns, search, cards, tables, empty/loading/error states, toasts, accessibility, touch targets, visual hierarchy, consistency, dark/light, AR/EN
- [ ] Define viewport matrix (360×640, 412×915, 768×1024) × 2 themes × 2 languages
- [ ] Systematically visit EVERY page and record findings (Playwright screenshots + snapshots)

### Task 2.2 — Produce `reports/MOBILE_UI_UX_AUDIT.md`
- [ ] Executive summary
- [ ] Critical / High / Medium / Low priority problem lists (each issue = a finding with location)
- [ ] Page-by-page analysis
- [ ] Recommended fixes
- [ ] Scoring: Mobile UX, Navigation, Typography, Forms, Touch UX, RTL, Visual Consistency, Accessibility (each /100)

**Phase 2 commit:** `Add mobile UI UX audit` → push. Update COMMIT_TRACKING.md.

---

## Phase 3 — Fix Mobile UI/UX Problems
> Fix findings from the audit, in order: Critical → High → Medium → Low. Keep existing design language.

### Task 3.1 — Convert audit findings into tasks
- [ ] Create individual task entries for every Critical finding
- [ ] Create individual task entries for every High finding
- [ ] Create individual task entries for every Medium finding
- [ ] Create individual task entries for every Low finding (batch by page/area)

### Task 3.2 — Fix Critical mobile issues
- [ ] Fix each critical finding; test on mobile viewports after each fix

### Task 3.3 — Fix High mobile issues
- [ ] Fix each high finding; test after each fix

### Task 3.4 — Fix Medium mobile issues
- [ ] Fix each medium finding; test after each fix

### Task 3.5 — Fix Low mobile issues
- [ ] Fix each low finding; test after each fix

### Task 3.6 — Re-run mobile audit
- [ ] Produce `reports/MOBILE_UI_UX_FINAL.md` with Before vs After comparison and updated scores

**Phase 3 commit:** `Fix mobile UI UX issues` → push. Update COMMIT_TRACKING.md.

---

## Phase 4 — Desktop / Browser UI/UX Audit (report only)

### Task 4.1 — Desktop audit methodology
- [ ] Checklist: layout, navigation, sidebar, navbar, cards, forms, tables, modals, dropdowns, search, typography, spacing, icons, RTL/LTR, dark/light, loading/error/empty states, accessibility, visual consistency
- [ ] Test browsers: Chrome, Edge (Firefox optional) at 1280×800 and 1920×1080
- [ ] Visit EVERY page and record findings

### Task 4.2 — Produce `reports/DESKTOP_UI_UX_AUDIT.md`
- [ ] Executive summary, Critical/High/Medium/Low issues, page-by-page results, recommendations, score /100

**Phase 4 commit:** `Add desktop UI UX audit` → push. Update COMMIT_TRACKING.md.

---

## Phase 5 — Fix Desktop UI/UX Problems

### Task 5.1 — Convert desktop findings into tasks
- [ ] Task entries per Critical issue
- [ ] Task entries per High issue
- [ ] Task entries per Medium issue
- [ ] Task entries per Low issue

### Task 5.2 — Fix Critical desktop issues
- [ ] Fix each; test on desktop after each fix

### Task 5.3 — Fix High desktop issues
- [ ] Fix each; test after each fix

### Task 5.4 — Fix Medium desktop issues
- [ ] Fix each; test after each fix

### Task 5.5 — Fix Low desktop issues
- [ ] Fix each; test after each fix

### Task 5.6 — Re-run desktop audit
- [ ] Produce `reports/DESKTOP_UI_UX_FINAL.md` with Before/After

**Phase 5 commit:** `Fix desktop UI UX issues` → push. Update COMMIT_TRACKING.md.

---

## Phase 6 — Complete Functional QA
> Not visual — actually interact with every feature and workflow. Do not assume anything works.

### Task 6.1 — Authentication
- [ ] Login (valid) PASS/FAIL
- [ ] Logout PASS/FAIL
- [ ] Remember Me PASS/FAIL
- [ ] Invalid login (wrong email/password) shows error, no token saved PASS/FAIL
- [ ] Session behavior (token expiry/reload keeps session) PASS/FAIL

### Task 6.2 — Dashboard
- [ ] Navigation to every page via sidebar PASS/FAIL
- [ ] Stat cards values match backend PASS/FAIL
- [ ] Quick actions PASS/FAIL
- [ ] Theme toggle + persistence after reload PASS/FAIL
- [ ] Language toggle + persistence + RTL/LTR PASS/FAIL

### Task 6.3 — Customers
- [ ] Create customer (all fields, AR/EN) PASS/FAIL
- [ ] Customer list/cards render + pagination/load-more PASS/FAIL
- [ ] Customer details view opens PASS/FAIL
- [ ] Edit customer (name/phone/whatsapp/email/address/notes/status/program/campaign/payment totals) PASS/FAIL
- [ ] Delete customer (soft-delete + confirm) PASS/FAIL
- [ ] Payment add (amount/method/date/ref/notes) updates paid/remaining/status PASS/FAIL
- [ ] Payment history edit + delete recalculates totals PASS/FAIL
- [ ] Status change from detail (selector + notes + history timeline) PASS/FAIL
- [ ] Communication log + add communication PASS/FAIL
- [ ] Messages slider + add message (customer/employee) PASS/FAIL
- [ ] WhatsApp click increments communication count PASS/FAIL
- [ ] Search customers PASS/FAIL
- [ ] Filters (status/comm type/country/etc.) PASS/FAIL
- [ ] Customers import (template, file upload, preview, apply) PASS/FAIL

### Task 6.4 — Programs & Campaigns
- [ ] Create program (prices per country) PASS/FAIL
- [ ] View/edit/delete program PASS/FAIL
- [ ] Program pricing settings (prices page) PASS/FAIL
- [ ] Create campaign PASS/FAIL
- [ ] Campaign details + add customers from campaign (uses program price) PASS/FAIL
- [ ] Campaign budget/payment display PASS/FAIL

### Task 6.5 — Settings pages
- [ ] Payment Methods: add/edit/delete (in-use protection) PASS/FAIL
- [ ] Communication Types: add/edit/delete PASS/FAIL
- [ ] Customer Statuses: add/edit/delete, system locked, used_by protection PASS/FAIL
- [ ] Webhook Logs: list, filter, detail modal, reprocess PASS/FAIL

### Task 6.6 — Tasks & Goals
- [ ] Admin: create task (assignee, deadline, links) PASS/FAIL
- [ ] Admin: update task status PASS/FAIL
- [ ] Admin: create/edit goal + progress PASS/FAIL
- [ ] Employee: view assigned tasks PASS/FAIL
- [ ] Employee: update task status + submit proof PASS/FAIL
- [ ] Employee: view goals + progress PASS/FAIL
- [ ] Weekly schedule (admin + employee) PASS/FAIL
- [ ] Performance dashboard PASS/FAIL

### Task 6.7 — Reports
- [ ] Every implemented report renders with correct data PASS/FAIL
- [ ] Report filters PASS/FAIL
- [ ] Export (if implemented) PASS/FAIL

### Task 6.8 — Users
- [ ] Create user with role PASS/FAIL
- [ ] Edit user/permissions PASS/FAIL
- [ ] Delete/protect admin PASS/FAIL

### Task 6.9 — Search
- [ ] Global search + all implemented per-page search PASS/FAIL

### Task 6.10 — Theme & Language
- [ ] Dark mode everywhere PASS/FAIL
- [ ] Light mode everywhere PASS/FAIL
- [ ] Theme persistence after reload PASS/FAIL
- [ ] Arabic + English translations complete on every page PASS/FAIL
- [ ] RTL/LTR correct on every page PASS/FAIL

### Task 6.11 — Webhook/API edge checks (backend)
- [ ] Webhook create/update/no_change/idempotent, 401, 400, rate limit PASS/FAIL
- [ ] Run full backend test suite `npm test` (currently 65) PASS/FAIL

### Task 6.12 — Produce `reports/FUNCTIONAL_QA_REPORT.md`
- [ ] Test environment, tested features, test cases table (Feature | Test | Result | Severity)
- [ ] Bugs list with severity, reproduction steps, expected vs actual, recommended fix
- [ ] `Functional Score: XX/100`

**Phase 6 commit:** `Add functional QA testing` → push. Update COMMIT_TRACKING.md.

---

## Phase 7 — Fix Functional Problems
> Every bug in the QA report becomes a task. Critical/high fixed first. Re-test after each fix. Do not mark fixed without reproducing and confirming.

### Task 7.1 — Convert bugs into tasks
- [ ] Task per Critical bug
- [ ] Task per High bug
- [ ] Task per Medium bug
- [ ] Task per Low bug (batch by module)

### Task 7.2 — Fix Critical functional bugs
- [ ] Reproduce → fix → confirm each

### Task 7.3 — Fix High functional bugs
- [ ] Reproduce → fix → confirm each

### Task 7.4 — Fix Medium functional bugs
- [ ] Reproduce → fix → confirm each

### Task 7.5 — Fix Low functional bugs
- [ ] Reproduce → fix → confirm each

### Task 7.6 — Retest affected functionality
- [ ] Re-run the affected test cases from FUNCTIONAL_QA_REPORT and update PASS/FAIL

**Phase 7 commit:** `Fix functional issues` → push. Update COMMIT_TRACKING.md.

---

## Phase 8 — Final Regression Test
> Verify fixing one module did not break another. Focus on data relationships: Customers ↔ Programs/Campaigns ↔ Pricing ↔ Payments ↔ Statuses ↔ Communications ↔ Reports ↔ Dashboard.

### Task 8.1 — Cross-module regression
- [ ] Program price change → new/edited customer payments reflect correctly; existing history untouched PASS/FAIL
- [ ] Customer payment add/edit/delete → dashboard totals + reports update PASS/FAIL
- [ ] Status change → history recorded, badge/card/detail consistent PASS/FAIL
- [ ] Communication add / WhatsApp increment → counter + log + dashboard consistent PASS/FAIL
- [ ] Webhook create/update customer → appears in customers, reports, dashboard PASS/FAIL
- [ ] User permissions → pages accessible per role PASS/FAIL

### Task 8.2 — Financial/integral calculation checks
- [ ] Verify payment paid/remaining/status after add/edit/delete PASS/FAIL
- [ ] Verify report totals match customer payment data PASS/FAIL
- [ ] Verify dashboard stat cards match backend counts PASS/FAIL

### Task 8.3 — Full suite re-run
- [ ] `npm test` all green (≥65) PASS/FAIL
- [ ] Mobile + desktop visual regression spot-check on key pages PASS/FAIL

**Phase 8 commit:** `Add final regression testing` → push. Update COMMIT_TRACKING.md.

---

## Phase 9 — Deployment Documentation

### Task 9.1 — Create `docs/DEPLOYMENT_GUIDE.md`
- [ ] Requirements (Node.js, MongoDB Atlas, env vars, Git)
- [ ] Backend deployment (install deps, env vars, MongoDB connection, start, production mode)
- [ ] MongoDB (create DB, create user, connection string, network access, security)
- [ ] Frontend (build/serve, connecting to backend API URL)
- [ ] Hosting options (frontend, backend, MongoDB) + recommended architecture diagram
- [ ] Environment variables documented (MONGODB_URI, JWT_SECRET, JWT_EXPIRE, PORT, WHATSAPP_WEBHOOK_SECRET, WEBHOOK_AUTH_MODE) — no real secrets in repo
- [ ] Production security (JWT, CORS, HTTPS, MongoDB access, env vars, rate limiting, password hashing, token handling, backup)
- [ ] Backup strategy (automatic backups, retention, restore process, manual backup, recovery)

**Phase 9 commit:** `Add deployment guide` → push. Update COMMIT_TRACKING.md.

---

## Phase 10 — Final Verification & Commit

### Task 10.1 — Final checks
- [ ] All reports exist: MOBILE_UI_UX_AUDIT.md, MOBILE_UI_UX_FINAL.md, DESKTOP_UI_UX_AUDIT.md, DESKTOP_UI_UX_FINAL.md, FUNCTIONAL_QA_REPORT.md, DEPLOYMENT_GUIDE.md
- [ ] TASKS4.md fully updated; no task marked `[x]` without being implemented + tested
- [ ] Full backend test suite passes
- [ ] App works on mobile + desktop, AR + EN, dark + light
- [ ] Working tree clean; all phases committed and pushed

### Task 10.2 — Final commit
- [ ] Final commit + push with summary message

**Phase 10 commit:** final push.

---

## Execution Order (do not skip)
1. ~~Analyze current application~~ (done)
2. Create TASKS4.md (this file — created) + COMMIT_TRACKING.md
3. Phase 1: Mobile responsiveness implementation
4. Phase 2: Mobile UI/UX audit
5. Phase 3: Fix mobile UI/UX + mobile final audit
6. Phase 4: Desktop UI/UX audit
7. Phase 5: Fix desktop UI/UX + desktop final audit
8. Phase 6: Complete functional QA
9. Phase 7: Fix functional bugs
10. Phase 8: Full regression test
11. Phase 9: Deployment documentation
12. Phase 10: Final Git commit + push