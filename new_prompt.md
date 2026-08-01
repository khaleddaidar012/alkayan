Add the following issues to `CRM_FIX_TASKS.md` as NEW atomic tasks.

IMPORTANT:
Do NOT merge them into existing tasks.
Break each one into very small implementation tasks.
Every task must have:

* Task ID
* Description
* Files to modify
* Status
* Dependencies (if any)

After updating the file, start implementing them one by one.

====================================================

## Feature Group: Program Price UI

### Task:

Improve the Program Price UI.

Current problem:
The program price is displayed in an ugly and unprofessional way.

Requirements:

* Make the price visually attractive.
* Use proper currency formatting.
* Align numbers correctly.
* Use thousands separators.
* Make the price stand out.
* Keep the same style across:

  * Program cards
  * Program details
  * Campaigns
  * Client screens

Example:

Price
5,000 EGP

====================================================

## Feature Group: Client Editing

Current problem:

Editing client information is unreliable.

Sometimes changes are not applied until the page is manually refreshed.

Required:

* Editing should update immediately.
* Save should always persist changes.
* Refresh local state after saving.
* Update UI without forcing the user to manually reload.
* Ensure backend and frontend remain synchronized.

====================================================

## Feature Group: Program Price Linked To Client Payments

This is a critical business rule.

Every client inside a campaign must be linked to the selected program.

The payment system must use that program price automatically.

Example:

Program price:
5000

Client pays:
1500

Automatically calculate:

Remaining:
3500

If program price changes later:

Existing payment history must remain valid.

New calculations must follow the updated program rules where appropriate.

====================================================

## Feature Group: Full Client Editing

The Edit Client screen must allow editing ALL client data.

Including:

* Name
* Phone
* WhatsApp
* Email
* Address
* Notes
* Subscription status
* Program
* Campaign
* Total amount
* Paid amount
* Remaining amount
* Payment records
* Payment notes

The payment history must also be editable.

Allow:

* Edit payment
* Delete payment
* Correct payment amount
* Correct payment notes

Every payment modification must automatically recalculate:

* Paid amount
* Remaining amount
* Payment status

====================================================

Workflow Rules

Before implementing any task:

1. Update CRM_FIX_TASKS.md.
2. Mark task as "In Progress".
3. Complete the implementation.
4. Test it.
5. Mark it as "[x] Done" only after successful testing.
6. Show:

   * Modified files
   * What changed
   * Any remaining issues

Never mark a task as Done unless the code has actually been implemented and verified.
