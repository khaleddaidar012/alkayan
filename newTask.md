
Fix Feature: Programs & Campaigns Issues - Al Kayan Al Araby CRM

## Main Goal

Fix existing issues inside the Programs module and Campaigns module.

The goal is to make client management inside programs/campaigns fully independent and accurate without forcing users to go back to the main Clients section.

---

# Important Rules Before Starting

⚠️ There is another Terminal running and fixing other problems.

Follow these rules:

- Do not make large changes.
- Do not modify unrelated files.
- Check existing code structure first.
- Keep fixes isolated.
- Do not break existing CRM features.

After completing every small task:

1. Stop.
2. Explain what was fixed.
3. Ask me to test.
4. Wait for my approval.
5. Only continue after confirmation.

---

# Phase 1: Program Clients Management

## Task 1.1

Review the Clients section inside Programs.

Current issue:

Inside:


Programs
↓
Clients


The client list appears, but editing client information is not available.

Currently:

The user must leave Programs and go to the main Clients page.

This is not acceptable.

---

Required:

Add full client editing inside Programs.

The user should be able to:

- Open client details.
- Edit client name.
- Edit phone number.
- Edit email.
- Edit address.
- Edit notes.
- Edit any available client information.

Changes must update the same client record in the database.

Do not create duplicate clients.

After finishing:

STOP and ask me to test.

---

## Task 1.2

Improve client management UI inside Programs.

Add:

- View client details.
- Edit button.
- Save changes.
- Cancel editing.

Keep the same CRM design system.

After finishing:

STOP and ask me to test.

---

# Phase 2: Campaign Client Payment Calculation Bug

## Task 2.1

Fix payment calculation when adding a client inside Campaigns.

Current bug:

Example:

Program price:


500 EGP


Client paid:


250 EGP


System currently shows:


Paid: 500
Remaining: 0


This is wrong.

---

Required logic:

Total Program Price:


500


Client Paid:


250


System should calculate:


Paid = 250

Remaining = 250


---

Payment status should be calculated automatically:

Examples:

### Not Paid:


Paid: 0
Remaining: 500
Status: Not Paid


---

### Partial Payment:


Paid: 250
Remaining: 250
Status: Partial


---

### Fully Paid:


Paid: 500
Remaining: 0
Status: Completed


---

After finishing:

STOP and ask me to test.

---

# Phase 3: Payment Data Structure Review

## Task 3.1

Review the payment model/data structure.

Make sure:

Client payment inside campaigns contains:


programPrice

paidAmount

remainingAmount

paymentStatus

paymentsHistory


If payment history exists:

Store:

- Payment amount.
- Date.
- Added by user.
- Notes.

Do not delete old payment data.

After finishing:

STOP and ask me to test.

---

# Phase 4: Campaign & Program Relationship Check

## Task 4.1

Review the relationship:


Program
↓
Campaign
↓
Clients



Make sure:

- Campaign inherits program pricing correctly.
- Client payments use the correct program price.
- No duplicated pricing logic exists.

After finishing:

STOP and ask me to test.

---

# Phase 5: Testing & Validation

## Task 5.1

Test complete flow:

Create Program:

Example:


Course Price = 500


Create Campaign.

Add Client:


Paid = 250


Expected:


Paid = 250
Remaining = 250
Status = Partial


Then add another payment:


250


Expected:


Paid = 500
Remaining = 0
Status = Completed


---

# Final Rule

Do not fix everything at once.

Work in this order:

1. Client editing inside Programs.
2. Test.
3. Payment calculation fix.
4. Test.
5. Payment structure review.
6. Test.
7. Final validation.

Always stop after every small task and wait for approval.