# Tasks Management System - Feature Documentation

## Feature Overview

The Tasks Management System (TMS) is a professional but simple module built into the Al Kayan Al Araby CRM. It lets Admin/Manager users create and assign work tasks to employees, link tasks to real CRM data (clients, campaigns, programs), set deadlines, and track employee performance. Employees use a dedicated dashboard to see their tasks, update status, and submit proof of completion.

## System Purpose

- Centralize employee task assignment in one place instead of phone calls or chat.
- Link every task to real CRM records (specific clients, a campaign's clients, or a program's clients).
- Give employees a clear daily/weekly view of what is due.
- Capture proof of completion so work is verifiable.
- Track employee productivity with goals and performance statistics.

## User Flow

### Admin / Manager flow
1. Open the Admin Tasks page and click "Add New Task".
2. Fill in task details: title, description, employee, deadline.
3. Choose the task source:
   - Specific selected clients, OR
   - All clients from a campaign, OR
   - All clients from a program.
4. Save: the task is created and linked to the chosen clients.
5. Open the Goals page to create goals for employees (daily/weekly/monthly/yearly).
6. Open the Performance Dashboard to review completion rates and late tasks.
7. Open the Weekly Schedule to see how tasks are distributed across the week.

### Employee flow
1. Log in and open the Employee Tasks Dashboard.
2. See Today's Tasks, This Week, and Completed Tasks as cards.
3. Click "Update Status" to move a task between pending -> in_progress -> completed.
4. When completing a task, submit proof (image screenshot or text explanation).
5. Open the Goals page to mark daily/weekly/monthly goals as complete.

## Permissions

| Role    | View tasks/goals | Create tasks/goals | Update tasks/goals | Delete tasks/goals |
|---------|------------------|--------------------|--------------------|--------------------|
| Admin   | Yes              | Yes                | Yes                | Yes (admin only)   |
| Manager | Yes              | Yes                | Yes                | No                 |
| Employee| Own tasks/goals only | No             | Own status/proof   | No                 |

- All API routes require authentication (protect middleware).
- Create/update of tasks and goals is limited to admin/manager via authorize middleware.
- Delete is admin only.
- The status endpoint (PUT /api/tasks/:id/status) lets the assigned employee update status and attach proof.

## Database Requirements

### Task model
- title (required)
- description
- assignedTo (ref: User, required)
- createdBy (ref: User, required)
- status: pending | in_progress | completed
- proofType: text | image | null
- proofContent
- relatedClients (refs: Customer)
- relatedCampaign (ref: Campaign)
- relatedProgram (ref: Course)
- deadline (required)
- createdAt / updatedAt

### Goal model
- title (required)
- employee (ref: User, required)
- createdBy (ref: User, required)
- period: daily | weekly | monthly | yearly
- completed (boolean)
- checklist (array of strings, checkbox achievements)
- createdAt / updatedAt

## API Endpoints

### Tasks (/api/tasks)
- GET / -> list all tasks (filters: status, assignedTo, deadline=today|thisWeek|thisMonth, search)
- GET /:id -> single task
- POST / -> create task (admin/manager)
- PUT /:id -> update task (admin/manager)
- DELETE /:id -> delete task (admin)
- PUT /:id/status -> update status + proof (employee)

### Goals (/api/goals)
- GET / -> list goals (filters: employee, period, completed)
- GET /:id -> single goal
- POST / -> create goal (admin/manager)
- PUT /:id -> update goal (admin/manager)
- DELETE /:id -> delete goal (admin)

## Frontend Pages

- tasks.html + js/tasks.js (Admin Tasks + Add New Task)
- employee-tasks.html + js/employee-tasks.js (Employee Tasks Dashboard)
- employee-goals.html + js/employee-goals.js (Employee Goals)
- admin-goals.html + js/admin-goals.js (Admin Goal Creation)
- admin-performance-dashboard.html + js/admin-performance-dashboard.js (Performance Dashboard)
- admin-weekly-schedule.html + js/admin-weekly-schedule.js (Admin Weekly Schedule)
- employee-weekly-schedule.html + js/employee-weekly-schedule.js (Employee Weekly Schedule)

## Future Improvements

- Email/notification alerts when a task deadline is near.
- Recurring tasks and task templates.
- File upload support for image proof stored on the server (currently stored as a reference/content string).
- Drag-and-drop weekly schedule planning.
- Department/team grouping and aggregated reports.
- Task comments and internal chat between admin and employee.
