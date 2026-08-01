# CRM Fix Tasks

This file tracks atomic implementation tasks for the CRM.

Legend:
- `[ ]` = Pending
- `[~]` = In Progress
- `[x]` = Done (implemented and verified)

---

## Feature Group A: Program Price UI

Goal: Make prices visually attractive, properly formatted (thousands separators), aligned, and consistent across Program cards, Program details, Campaigns and Client screens.

### A-1: Shared currency formatting + price display CSS
- **Description**: Standardize `formatCurrency` to always render `5,000 EGP` style (comma thousands separator). Add reusable `.price-display` CSS classes for the new price presentation.
- **Files to modify**: `frontend/js/customers.js`, `frontend/js/programs.js`, `frontend/css/customers.css`, `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: None

### A-2: Program card price display
- **Description**: Replace the plain `💰 Price: X EGP` line on program cards with a prominent, attractive price block.
- **Files to modify**: `frontend/js/programs.js` (`renderPrograms`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: A-1

### A-3: Program details price display
- **Description**: Apply the same attractive price styling in the Program details info grid.
- **Files to modify**: `frontend/js/programs.js` (`showProgramDetails`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: A-1

### A-4: Campaign screens price display
- **Description**: Apply the consistent price formatting to Campaign budget display and per-customer payment amounts (total/paid/remaining) inside campaign details.
- **Files to modify**: `frontend/js/programs.js` (`showCampaignDetails`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: A-1

### A-5: Client screens price display
- **Description**: Apply the same price presentation to Customer cards (pay section) and Customer details (payment summary) screens.
- **Files to modify**: `frontend/js/customers.js` (`renderCustomers`, `populateDetails`), `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: A-1

---

## Feature Group B: Client Editing (reliability)

Goal: Editing client info must update immediately, persist on save, refresh local state and stay synchronized without manual page reload.

### B-1: Backend — preserve/merge full payment on customer update
- **Description**: In `updateCustomer`, preserve `programPrice`, `discount`, `initialPayment`, `nextPaymentDate`, `paymentMethod` and the payment `history` when a partial `payment` object is sent, instead of dropping them.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### B-2: Frontend — refresh local state after edit save
- **Description**: In `customers.js` edit flow, after a successful save update `allCustomers`, re-render stats, filters and grid, and re-fetch/re-render the details view when it is currently visible so changes appear immediately (no manual reload).
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: B-1

### B-3: Frontend — details page save + edit modal payment fields
- **Description**: Make the Status Management save handler refresh the local customer entry and details view, and make the edit modal correctly load payment fields (program price, discount, final price, initial payment) so re-saving does not corrupt values.
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: B-1, B-2

---

## Feature Group C: Program Price Linked To Client Payments

Goal: Every customer in a campaign is linked to the selected program; payment totals use the program price automatically; price changes never break existing payment history.

### C-1: Backend — auto-apply program price on customer create
- **Description**: In `createCustomer`, when the customer is subscribed and a `programRef` is present but no explicit total is given, auto-set `payment.programPrice`, `payment.finalPrice` from the linked program price (minus discount), keeping any explicit `totalAmount` as the source of truth.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### C-2: Backend — recompute payment on program/price update
- **Description**: In `updateCustomer`, when `programRef`/program price is updated, re-derive `programPrice`/`finalPrice` for the customer only where appropriate; always recompute `remainingAmount` and `payment.status` from `paidAmount` while keeping the payment history untouched.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: C-1

### C-3: Frontend — campaign add-customer form uses program price
- **Description**: When adding a customer from a Program/Campaign context, prefill the payment amount with the program price and show the program price automatically.
- **Files to modify**: `frontend/js/programs.js`
- **Status**: [x]
- **Dependencies**: C-1

### C-4: Frontend — customers edit modal auto-fill price
- **Description**: Add program price + discount inputs to the customer modal; auto-fill total amount from the selected program price.
- **Files to modify**: `frontend/customers.html`, `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: C-1

---

## Feature Group D: Full Client Editing

Goal: Edit ALL client data (name, phone, whatsapp, email, address, notes, status, program, campaign, totals) plus editable payment history (edit/delete/correct amount/notes) with automatic recalculation of paid/remaining/status.

### D-1: Add `address` field to Customer model
- **Description**: Add an optional `address` string field to the Customer schema.
- **Files to modify**: `backend/models/Customer.js`
- **Status**: [x]
- **Dependencies**: None

### D-2: Allow `address` + `payment` totals in customer update
- **Description**: Add `address` to `allowedFields` in `updateCustomer`; allow explicit `payment.totalAmount`/`paidAmount` overrides that recalculate remaining/status.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: D-1

### D-3: Backend — payment record edit/delete endpoints
- **Description**: Add `PUT /api/customers/:id/payments/:paymentId` (edit amount, notes, method, date, reference) and `DELETE /api/customers/:id/payments/:paymentId`. Every change recalculates `paidAmount = sum(history)`, `remainingAmount`, and `payment.status`.
- **Files to modify**: `backend/routes/customers.js`, `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### D-4: Frontend — payment history edit/delete UI
- **Description**: Add Edit ✏️ and Delete 🗑️ buttons per payment row in the payment history table inside customer details; wire them to the new endpoints and refresh local state + details.
- **Files to modify**: `frontend/js/customers.js`, `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: D-3

### D-5: Frontend — payment edit modal
- **Description**: Add a modal to edit an existing payment record (amount, method, date, reference number, notes).
- **Files to modify**: `frontend/customers.html`, `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: D-3, D-4

### D-6: Edit customer modal — all fields
- **Description**: Add Address + Campaign fields to the edit customer modal; include payment total/paid/remaining inputs that recalculate live.
- **Files to modify**: `frontend/customers.html`, `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: D-1, D-2

### D-7: Frontend — openEditModal populate all fields
- **Description**: Populate address, campaign, and payment fields (total, paid, remaining) when opening the edit modal; submit them on save.
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: D-6

### D-8: i18n keys for new fields/actions
- **Description**: Add translation keys for `address`, `campaign`, `editPayment`, `deletePayment`, `paymentUpdated`, `paymentDeleted`, `confirmDeletePayment` etc. (Arabic + English).
- **Files to modify**: `frontend/js/i18n.js`
- **Status**: [x]
- **Dependencies**: None

---

## Feature Group E: Program Price UI

Goal: Make the program price visually attractive, properly currency-formatted (thousands separators, e.g. `5,000 EGP`), correctly aligned, prominent, and consistent across Program cards, Program details, Campaigns and Client screens.

### E-1: Shared currency formatting + price display CSS
- **Description**: Ensure `formatCurrency` always renders `5,000 EGP` style (en-US thousands separators) in both `customers.js` and `programs.js`, and that reusable `.price-display` / `.price-value` / `.price-label` CSS classes exist for the attractive price presentation.
- **Files to modify**: `frontend/js/customers.js`, `frontend/js/programs.js`, `frontend/css/customers.css`, `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: None

### E-2: Program card price display
- **Description**: Replace any plain `💰 Price: X EGP` line on program cards with a prominent, attractive price block (`priceDisplay`).
- **Files to modify**: `frontend/js/programs.js` (`renderPrograms`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: E-1

### E-3: Program details price display
- **Description**: Apply the same attractive price styling in the Program details info grid.
- **Files to modify**: `frontend/js/programs.js` (`showProgramDetails`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: E-1

### E-4: Campaign screens price display
- **Description**: Apply consistent price formatting to Campaign budget display and per-customer payment amounts (total / paid / remaining) inside campaign details.
- **Files to modify**: `frontend/js/programs.js` (`showCampaignDetails`), `frontend/css/programs.css`
- **Status**: [x]
- **Dependencies**: E-1

### E-5: Client screens price display
- **Description**: Apply the same price presentation to Customer cards (pay section) and Customer details (payment summary).
- **Files to modify**: `frontend/js/customers.js` (`renderCustomers`, `populateDetails`), `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: E-1

---

## Feature Group F: Client Editing (reliability)

Goal: Editing client info must update immediately, always persist on save, refresh local state and keep backend/frontend synchronized without forcing the user to manually reload the page.

### F-1: Backend — preserve/merge full payment on customer update
- **Description**: In `updateCustomer`, preserve `programPrice`, `discount`, `initialPayment`, `nextPaymentDate`, `paymentMethod` and the payment `history` when a partial `payment` object is sent, instead of dropping them.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### F-2: Frontend — refresh local state after edit save
- **Description**: In `customers.js` edit flow, after a successful save update `allCustomers`, re-render stats, filters and grid so the changes appear immediately (no manual reload).
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: F-1

### F-3: Frontend — details page save + edit modal payment fields
- **Description**: Make the Status Management save handler refresh the local customer entry and details view, and make the edit modal correctly load payment fields (program price, discount, final price, initial payment) so re-saving does not corrupt values.
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: F-1, F-2

### F-4: End-to-end verification
- **Description**: Verify through the UI that editing a client (basic info + payment) updates immediately and persists after reload, without stale data.
- **Files to modify**: None (verification)
- **Status**: [x]
- **Dependencies**: F-2, F-3

---

## Feature Group G: Program Price Linked To Client Payments

Goal: Every client inside a campaign is linked to the selected program; the payment system uses that program price automatically (e.g. program 5,000 → client pays 1,500 → remaining 3,500); if the program price changes later, existing payment history stays valid and new calculations follow the updated rules.

### G-1: Backend — auto-apply program price on customer create
- **Description**: In `createCustomer`, when the customer is subscribed and a `programRef` is present but no explicit total is given, auto-set `payment.programPrice`, `payment.finalPrice` from the linked program price (minus discount), keeping any explicit `totalAmount` as source of truth.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### G-2: Backend — recompute payment on program/price update
- **Description**: In `updateCustomer`, when `programRef`/program price is updated, re-derive `programPrice`/`finalPrice` only where appropriate; always recompute `remainingAmount` and `payment.status` from `paidAmount` while keeping the payment history untouched.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: G-1

### G-3: Frontend — campaign add-customer form uses program price
- **Description**: When adding a customer from a Program/Campaign context, prefill the payment amount with the program price and show the program price automatically.
- **Files to modify**: `frontend/js/programs.js`
- **Status**: [x]
- **Dependencies**: G-1

### G-4: Frontend — customers edit modal auto-fill price
- **Description**: Add program price + discount inputs to the customer modal; auto-fill total amount from the selected program price.
- **Files to modify**: `frontend/customers.html`, `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: G-1

### G-5: End-to-end verification
- **Description**: Verify that adding a subscribed client to a campaign records the program price and computes paid/remaining correctly, and that changing the program price later keeps existing payment history valid while new calculations follow updated rules.
- **Files to modify**: None (verification)
- **Status**: [x]
- **Dependencies**: G-2, G-3

---

## Feature Group H: Full Client Editing

Goal: The Edit Client screen must allow editing ALL client data (name, phone, whatsapp, email, address, notes, subscription status, program, campaign, total amount, paid amount, remaining amount) plus editable payment history (edit payment, delete payment, correct amount, correct notes). Every payment modification automatically recalculates paid amount, remaining amount and payment status.

### H-1: Backend — allow all client fields in customer update
- **Description**: `updateCustomer` must accept name, phone, whatsapp, email, address, notes, status, program, programRef, campaign, assignedEmployee and explicit payment totals; recalculate remaining/status.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### H-2: Backend — payment record edit endpoint
- **Description**: Add/verify `PUT /api/customers/:id/payments/:paymentId` to edit amount, method, date, reference number and notes of a payment record.
- **Files to modify**: `backend/routes/customers.js`, `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### H-3: Backend — payment record delete endpoint
- **Description**: Add/verify `DELETE /api/customers/:id/payments/:paymentId` to delete a payment record.
- **Files to modify**: `backend/routes/customers.js`, `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: None

### H-4: Backend — auto-recalculate totals on payment modifications
- **Description**: After any payment edit/delete/add, recompute `paidAmount = sum(history)`, `remainingAmount = finalPrice - paidAmount` and `payment.status` automatically.
- **Files to modify**: `backend/controllers/customerController.js`
- **Status**: [x]
- **Dependencies**: H-2, H-3

### H-5: Frontend — add Address + Campaign fields to customer modal
- **Description**: Add an Address input and a Campaign select to the add/edit customer modal in `customers.html`; populate the Campaign dropdown from the campaigns API.
- **Files to modify**: `frontend/customers.html`, `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: H-1

### H-6: Frontend — populate + submit address & campaign in edit modal
- **Description**: In `customers.js`, load and populate address + campaign in `openEditModal`, and submit them in `handleFormSubmit` (create + update).
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: H-5

### H-7: Frontend — display address & campaign in customer details
- **Description**: Show Address and Campaign values in the customer details view (`populateDetails`).
- **Files to modify**: `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: H-1

### H-8: Frontend — payment history edit/delete UI
- **Description**: Add Edit ✏️ and Delete 🗑️ buttons per payment row in the payment history table; wire them to the new endpoints and refresh local state + details.
- **Files to modify**: `frontend/js/customers.js`, `frontend/css/customers.css`
- **Status**: [x]
- **Dependencies**: H-2, H-3

### H-9: Frontend — payment edit modal
- **Description**: Add a modal to edit an existing payment record (amount, method, date, reference number, notes) and submit via PUT; refresh local state + details.
- **Files to modify**: `frontend/customers.html`, `frontend/js/customers.js`
- **Status**: [x]
- **Dependencies**: H-2, H-8

### H-10: i18n keys for new fields/actions
- **Description**: Add translation keys for `address`, `campaign`, `editPayment`, `deletePayment`, `paymentUpdated`, `paymentDeleted`, `confirmDeletePayment`, `totalPaid`, `noPaymentsYet`, `actions` (Arabic + English).
- **Files to modify**: `frontend/js/i18n.js`
- **Status**: [x]
- **Dependencies**: None

---

## Workflow Notes

1. Mark task `[~]` In Progress before implementing.
2. Implement the code.
3. Test (API via curl / UI via browser).
4. Mark `[x]` Done only after successful verification.
5. After each task report: modified files, what changed, remaining issues.
