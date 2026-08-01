# Customers Module — Implementation Roadmap

## Overview
Build the Customers module for Al Kayan Al Arabi CRM: card-based listing, detail view, multi-status workflow, payment tracking, filtering/searching, and permissions.

---

## Phase 1: Backend Foundation

### 1.1 Update Customer Model
- [ ] Add new fields to `backend/models/Customer.js`:
  - `whatsapp` (String)
  - `program` (String / ref to Course)
  - `assignedEmployee` (ObjectId ref to User)
  - `registrationDate` (Date)
  - `status` (enum: subscribed, potential, thinking, noResponse, rejected)
  - **For subscribed**:
    - `payment.status` (enum: notPaid, partiallyPaid, fullyPaid)
    - `payment.totalPrice` (Number)
    - `payment.paidAmount` (Number)
    - `payment.remainingAmount` (Number)
    - `payment.nextPaymentDate` (Date)
  - **For rejected**:
    - `rejectionReason` (String)
    - `rejectionCustomReason` (String)
  - `notes` (String)
- **Priority:** High
- **Depends on:** Nothing
- **Complexity:** Easy

### 1.2 Create Customer CRUD Controller
- [ ] Create `backend/controllers/customerController.js`
- [ ] Implement `getCustomers` — list with filters (status, program, employee, date range, enrollments count)
- [ ] Implement `getCustomer` — single customer by ID with full details
- [ ] Implement `createCustomer` — create new customer (accessible by Employee+)
- [ ] Implement `updateCustomer` — update fields (accessible by Employee+, but only Manager+ can delete)
- [ ] Implement `deleteCustomer` — accessible by Manager+ only
- [ ] Implement `updateCustomerStatus` — dedicated status update endpoint with validation (sets payment fields for subscribed, reason for rejected)
- **Priority:** High
- **Depends on:** 1.1
- **Complexity:** Medium

### 1.3 Create Customer Routes
- [ ] Create `backend/routes/customers.js`
- [ ] `GET /api/customers` — list (filters as query params)
- [ ] `GET /api/customers/:id` — single
- [ ] `POST /api/customers` — create
- [ ] `PUT /api/customers/:id` — update
- [ ] `DELETE /api/customers/:id` — delete (Manager+)
- [ ] `PUT /api/customers/:id/status` — status change
- [ ] Wire permissions middleware per route (employee can create/edit, manager+ can delete)
- **Priority:** High
- **Depends on:** 1.2
- **Complexity:** Easy

### 1.4 Register Customers Route in Server
- [ ] Add `app.use('/api/customers', require('./routes/customers'))` to `server.js`
- **Priority:** High
- **Depends on:** 1.3
- **Complexity:** Easy

---

## Phase 2: Customers Listing Page (Card View)

### 2.1 Create Customers HTML Page
- [ ] Create `frontend/customers.html`
- [ ] Sidebar (same pattern as users.html/dashboard.html)
- [ ] Header with lang/theme/logout buttons
- [ ] Main content area with:
  - Page title "Customers"
  - Filter bar
  - Search input
  - Card grid container
  - Add Customer button
- **Priority:** High
- **Depends on:** 1.4
- **Complexity:** Easy

### 2.2 Create Customers CSS
- [ ] Create `frontend/css/customers.css`
- [ ] Card grid layout (responsive: 4 cols → 2 cols → 1 col)
- [ ] Customer card design:
  - Avatar/initial circle
  - Name
  - WhatsApp number
  - Status badge (color-coded per status)
  - Program name
  - Assigned employee
  - Registration date
  - Subtle hover lift effect
- [ ] Search input styling
- [ ] Filter dropdowns/buttons styling
- [ ] RTL support with `[dir="rtl"]` selectors
- [ ] Dark mode via CSS variables
- [ ] Empty state styling
- **Priority:** High
- **Depends on:** 2.1
- **Complexity:** Medium

### 2.3 Create Customers JS — Data Loading
- [ ] Create `frontend/js/customers.js`
- [ ] Auth guard (redirect to login if no token)
- [ ] `loadCustomers()` — fetch from `GET /api/customers`
- [ ] Cache customer list in `allCustomers` array
- [ ] Initial render on DOMContentLoaded
- **Priority:** High
- **Depends on:** 1.4, 2.1
- **Complexity:** Easy

### 2.4 Implement Card Rendering
- [ ] `renderCustomers()` — build card HTML from array
- [ ] Each card: avatar initial, name, whatsapp, status badge, program, employee, date
- [ ] Status color mapping:
  - subscribed → green
  - potential → gold
  - thinking → blue
  - noResponse → gray
  - rejected → red
- [ ] Empty state when no customers
- [ ] Click card → navigate to customer details page (store customer ID)
- **Priority:** High
- **Depends on:** 2.3
- **Complexity:** Medium

### 2.5 Implement Global Search
- [ ] Search input handler with debounce (300ms)
- [ ] Filter `allCustomers` by name, phone, whatsapp, email (case-insensitive)
- [ ] Re-render cards on search results
- **Priority:** Medium
- **Depends on:** 2.4
- **Complexity:** Easy

### 2.6 Implement Filters
- [ ] Status filter dropdown
- [ ] Program filter dropdown (populated from API)
- [ ] Employee filter dropdown (populated from /api/users)
- [ ] Date range inputs (from / to registration date)
- [ ] Apply filters on change → re-render
- [ ] Combine with search (both active at once)
- **Priority:** Medium
- **Depends on:** 2.4
- **Complexity:** Medium

### 2.7 Add Customer Button / Modal
- [ ] "Add Customer" button in toolbar
- [ ] Create customer modal with form fields:
  - Name (required)
  - Phone
  - WhatsApp (required)
  - Email
  - Program (dropdown from API)
  - Assigned Employee (dropdown from API)
  - Status (dropdown)
  - Notes
- [ ] Form validation
- [ ] Submit → POST /api/customers → reload list
- [ ] RTL/LTR form layout
- **Priority:** High
- **Depends on:** 2.4
- **Complexity:** Medium

---

## Phase 3: Customer Details Page

### 3.1 Create Customer Details HTML (same page, different view)
- [ ] Add details view container in `customers.html` (hidden by default)
- [ ] Back button at top
- [ ] Sections:
  - Basic info (name, phone, whatsapp, email, program, employee, date)
  - Status section with change status UI
  - Payment section (shown only when status = subscribed)
  - Rejection section (shown only when status = rejected)
  - Notes section
- **Priority:** High
- **Depends on:** 2.1
- **Complexity:** Medium

### 3.2 Implement Details View Logic
- [ ] `showCustomerDetails(customerId)` — find customer, populate details view
- [ ] Back button → hide details, show card grid
- [ ] Store current view state (`view: 'list' | 'details'`)
- [ ] Update URL or use internal state tracking
- [ ] Fetch full customer data from `GET /api/customers/:id`
- **Priority:** High
- **Depends on:** 3.1, 2.4
- **Complexity:** Easy

### 3.3 Customer Details CSS
- [ ] Details container styling
- [ ] Info rows (label + value)
- [ ] Status change dropdown with save button
- [ ] Payment section cards/fields
- [ ] Rejection reason display
- [ ] Notes textarea
- [ ] Back button styling
- [ ] RTL + dark mode support
- **Priority:** High
- **Depends on:** 3.1
- **Complexity:** Medium

---

## Phase 4: Customer Status Management

### 4.1 Status Change UI in Details View
- [ ] Status dropdown (or radio buttons) showing all 5 statuses
- [ ] On selecting "subscribed" → show payment fields
- [ ] On selecting "rejected" → show rejection reason fields
- [ ] Save button → `PUT /api/customers/:id/status`
- [ ] Success toast + refresh
- **Priority:** High
- **Depends on:** 3.2
- **Complexity:** Medium

### 4.2 Payment Section (Subscribed Status)
- [ ] Payment status badge (not paid / partially / fully)
- [ ] Editable fields:
  - Total price
  - Paid amount (auto-calculates remaining)
  - Remaining amount (read-only, calculated)
  - Next payment date (date picker)
- [ ] Save payment info → `PUT /api/customers/:id` (update customer)
- [ ] Visual indicators: color-coded payment status
- **Priority:** Medium
- **Depends on:** 4.1
- **Complexity:** Medium

### 4.3 Rejection Section (Rejected Status)
- [ ] Show rejection reason selector:
  - Price is too high
  - Not interested in this field
  - Other (with text input for custom reason)
- [ ] Save rejection info
- **Priority:** Medium
- **Depends on:** 4.1
- **Complexity:** Easy

---

## Phase 5: Permissions & Access Control

### 5.1 Frontend Permission Checks
- [ ] Hide Delete button for Employee role
- [ ] Hide Disable/Delete controls based on user permissions
- [ ] Check `permissions.customers` from logged-in user data
- [ ] Disable/remove delete action for non-manager roles
- [ ] Show/hide UI elements based on role
- **Priority:** High
- **Depends on:** 2.4
- **Complexity:** Easy

### 5.2 Backend Permission Enforcement
- [ ] `authorize` middleware on DELETE route (manager, admin)
- [ ] `protect` middleware on all routes
- [ ] `authorize('admin', 'manager', 'employee')` on create/update
- **Priority:** High
- **Depends on:** 1.3
- **Complexity:** Easy

---

## Phase 6: Edit & Delete

### 6.1 Edit Customer (from card or details)
- [ ] Edit button on card (dots menu or icon)
- [ ] Edit button in details view
- [ ] Reuse the Add Customer modal in edit mode (pre-populated)
- [ ] Save → `PUT /api/customers/:id` → refresh
- **Priority:** Medium
- **Depends on:** 2.7, 3.2
- **Complexity:** Medium

### 6.2 Delete Customer (Manager+ only)
- [ ] Delete icon on card (hidden for employees)
- [ ] Delete button in details view (hidden for employees)
- [ ] Confirmation modal
- [ ] Delete → `DELETE /api/customers/:id` → redirect to list
- **Priority:** Medium
- **Depends on:** 2.4, 5.1
- **Complexity:** Easy

---

## Phase 7: Translation & i18n

### 7.1 Add Customers Translations
- [ ] Add `customers` section to `i18n.js` (Arabic + English)
- [ ] Keys needed:
  - Module name, page title
  - All 5 statuses and their Arabic names
  - Payment statuses
  - Rejection reasons
  - Form labels (name, phone, whatsapp, email, program, employee, notes)
  - Filter labels
  - Search placeholder
  - Buttons: add, edit, delete, save, cancel, back
  - Empty state
  - Toast messages
  - Details section headers
- **Priority:** Medium
- **Depends on:** 2.1
- **Complexity:** Easy

### 7.2 Wire i18n to Customers Page
- [ ] Call `initI18n('customers', 'customers')` on page load
- [ ] Add `data-i18n` attributes to all static text elements
- [ ] Call `applyTranslation` on language switch
- **Priority:** Medium
- **Depends on:** 7.1
- **Complexity:** Easy

---

## Phase 8: Navigation & Sidebar

### 8.1 Add Customers Link to Sidebar
- [ ] Add `data-nav="customers"` to Customers nav item in `dashboard.html`
- [ ] Add Customers nav item to `users.html` sidebar
- [ ] Ensure navigation works between all pages
- **Priority:** Medium
- **Depends on:** 2.1
- **Complexity:** Easy

---

## Phase 9: Polish & Edge Cases

### 9.1 Stats Cards
- [ ] Add summary stats at top of customers page:
  - Total customers
  - Subscribed count
  - Potential count
  - Rejected count
- [ ] Fetch counts from API or calculate from loaded data
- **Priority:** Low
- **Depends on:** 2.4
- **Complexity:** Easy

### 9.2 Loading States
- [ ] Skeleton cards while loading
- [ ] Spinner in buttons during API calls
- [ ] Disable buttons during submission
- **Priority:** Low
- **Depends on:** 2.4
- **Complexity:** Easy

### 9.3 Error Handling
- [ ] Toast on API errors
- [ ] Fallback UI when API is down
- [ ] Validated form inputs with error messages
- **Priority:** Low
- **Depends on:** 2.3
- **Complexity:** Easy

---

## Implementation Order Summary

| # | Task | Phase | Complexity |
|---|------|-------|------------|
| 1 | 1.1 — Update Customer Model | Backend | Easy |
| 2 | 1.2 — Create Customer Controller | Backend | Medium |
| 3 | 1.3 — Create Customer Routes | Backend | Easy |
| 4 | 1.4 — Register Routes in Server | Backend | Easy |
| 5 | 2.1 — Create Customers HTML | Frontend | Easy |
| 6 | 2.2 — Create Customers CSS | Frontend | Medium |
| 7 | 7.1 — Add i18n Translations | Frontend | Easy |
| 8 | 2.3 — JS Data Loading | Frontend | Easy |
| 9 | 2.4 — Card Rendering | Frontend | Medium |
| 10 | 2.5 — Search | Frontend | Easy |
| 11 | 2.6 — Filters | Frontend | Medium |
| 12 | 5.1 — Frontend Permissions | Frontend | Easy |
| 13 | 2.7 — Add Customer Modal | Frontend | Medium |
| 14 | 3.1 — Details HTML | Frontend | Medium |
| 15 | 3.3 — Details CSS | Frontend | Medium |
| 16 | 3.2 — Details View Logic | Frontend | Easy |
| 17 | 4.1 — Status Change UI | Frontend | Medium |
| 18 | 4.2 — Payment Section | Frontend | Medium |
| 19 | 4.3 — Rejection Section | Frontend | Easy |
| 20 | 6.1 — Edit Customer | Frontend | Medium |
| 21 | 6.2 — Delete Customer | Frontend | Easy |
| 22 | 5.2 — Backend Permissions | Backend | Easy |
| 23 | 7.2 — Wire i18n | Frontend | Easy |
| 24 | 8.1 — Sidebar Navigation | Frontend | Easy |
| 25 | 9.1 — Stats Cards | Frontend | Easy |
| 26 | 9.2 — Loading States | Frontend | Easy |
| 27 | 9.3 — Error Handling | Frontend | Easy |

---

**Total: 27 tasks** — each meant to be implemented one at a time, in order.

---
