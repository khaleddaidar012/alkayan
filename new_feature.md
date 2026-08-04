# Feature: Tasks Management System - Al Kayan Al Araby CRM

## Main Goal

Build a professional but simple Tasks Management System for managing employees' tasks and tracking their performance.

The system allows Admin / Manager to:

- Create tasks for employees.
- Assign tasks to employees.
- Link tasks with existing clients in the system.
- Assign tasks based on campaigns or programs.
- Create goals for employees.
- Track employee productivity and performance.

Employees can:

- View their assigned tasks professionally.
- Update task status.
- Upload proof of completion (image or text).
- Track their daily, weekly, and monthly goals.

---

# Important Rules Before Starting

⚠️ There is another Terminal running and fixing problems in the project.

Follow these rules:

- Do not make big changes at once.
- Do not modify unrelated files.
- Check existing project structure before editing.
- Avoid breaking existing features.
- Keep changes isolated.

After completing every small task:

1. Stop.
2. Explain what was completed.
3. Ask me to test the changes.
4. Wait for my confirmation.
5. Do not continue to the next task until I approve.

---

# Phase 1: Feature Documentation & Preparation

## Task 1.1

Create documentation file:


docs/tasks-feature.md


The file should contain:

- Feature overview.
- System purpose.
- User flow.
- Permissions.
- Database requirements.
- Future improvements.

After finishing:

STOP and ask me to test.

---

# Phase 2: Database Design

## Task 2.1

Create the Task Model only.

Task Model should include:


title
description
assignedTo
createdBy
status


Status values:


pending
in_progress
completed


Proof system:


proofType


Values:


text
image


Other fields:


proofContent
relatedClients
relatedCampaign
relatedProgram
deadline
createdAt
updatedAt


Purpose:

A task can be connected to:

- Specific clients.
- Entire campaign clients.
- Entire program clients.

After finishing:

STOP and ask me to test.

---

## Task 2.2

Create Goal Model.

Goal Model:

Fields:


title
employee
createdBy
period
completed
createdAt
updatedAt


Period values:


daily
weekly
monthly
yearly


Goals work as checkbox achievements.

Example:


☑ Contact 20 clients

☐ Complete weekly report


After finishing:

STOP and ask me to test.

---

# Phase 3: Admin Task Management

## Task 3.1

Create Admin Tasks Page.

The page should display:

- All tasks.
- Task status.
- Assigned employee.
- Creation date.

Add filters:

- Employee filter.
- Status filter.
- Date filter.

Keep UI professional and simple.

After finishing:

STOP and ask me to test.

---

## Task 3.2

Create Add New Task Feature.

Admin / Manager can create tasks.

Task assignment options:

### Option 1:
Assign selected clients.

Example:

Choose 50 specific clients.

---

### Option 2:
Assign all clients from a campaign.

Example:

Campaign:

"Ramadan Campaign"

Assign all campaign clients to employee.

---

### Option 3:
Assign all clients from a program.

Example:

Program:

"English Course"

Assign all related clients.

---

The admin selects:

- Employee.
- Clients source.
- Deadline.
- Task details.

After saving:

Tasks are automatically created.

After finishing:

STOP and ask me to test.

---

# Phase 4: Employee Tasks Dashboard

## Task 4.1

Create Employee Tasks Dashboard.

Display:


Today's Tasks

This Week

Completed Tasks


Each task card should contain:

- Task title.
- Number of clients.
- Deadline.
- Status.
- Progress.

Professional card design.

After finishing:

STOP and ask me to test.

---

## Task 4.2

Add Task Status Update.

Employee can change task status:


Pending
↓
Working On It
↓
Completed


The update should happen without page refresh.

After finishing:

STOP and ask me to test.

---

## Task 4.3

Add Completion Proof System.

When employee completes a task:

They can submit proof using:

Option 1:

Upload screenshot/image.

Option 2:

Write text explanation.

Save proof with the task.

Admin can review the proof.

After finishing:

STOP and ask me to test.

---

# Phase 5: Goals System

## Task 5.1

Create Employee Goals Page.

Display:


Daily Goals

Weekly Goals

Monthly Goals


Each goal should appear as checkbox.

Example:


☑ Follow up with 30 customers

☐ Finish weekly report


Employee can mark goals as completed.

After finishing:

STOP and ask me to test.

---

## Task 5.2

Create Admin Goal Creation.

Admin can:

- Create new goal.
- Select employee.
- Select period.
- Add description.
- Save goal.

After finishing:

STOP and ask me to test.

---

# Phase 6: Weekly Task Planning

## Task 6.1

Create Weekly Schedule View for Admin.

Create calendar/table view:

Days:


Sunday
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday


Admin can view:

- Employees.
- Assigned tasks.
- Task distribution.
- Daily workload.

After finishing:

STOP and ask me to test.

---

## Task 6.2

Create Weekly Schedule View for Employees.

Employee can view:

- Weekly plan.
- Daily tasks.
- Deadlines.
- Progress.

After finishing:

STOP and ask me to test.

---

# Phase 7: Performance Tracking

## Task 7.1

Create Employee Performance Dashboard.

Track performance for:


Today

This Week

Last Week

This Month

Last Month

This Year

Previous Years


Show statistics:

- Total tasks.
- Completed tasks.
- Pending tasks.
- Late tasks.
- Completion percentage.
- Goal completion rate.

After finishing:

STOP and ask me to test.

---

# Phase 8: UI Improvements

## Task 8.1

Improve Task Cards UI.

Add:

- Progress bars.
- Status badges.
- Simple animations.
- Better spacing.
- Professional layout.

Keep the design consistent with the CRM theme.

After finishing:

STOP and ask me to test.

---

## Task 8.2

Final Feature Review.

Check:

- Permissions.
- Admin workflow.
- Employee workflow.
- Database relations.
- Performance dashboard.
- No broken existing features.

Do not make a large refactor.

Only fix required issues.

After finishing:

Confirm that Tasks Management Feature is completed.

---

# Development Workflow Reminder

Always follow:

Small Task → Stop → Ask For Testing → Wait For Approval → Continue

Do not continue automatically.