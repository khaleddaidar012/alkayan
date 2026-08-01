// Admin Weekly Schedule Controller
class AdminWeeklySchedule {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
      name: 'Admin Name',
      role: 'admin'
    };
    this.tasks = [];
    this.employees = [];
    this.apiBaseUrl = '/api/tasks';
    this.init();
  }

  init() {
    this.updateUserInfo();
    this.fetchTasksAndEmployees();
    this.setupEventListeners();
    this.initSidebar();
    this.initWeekSelector();
  }

  updateUserInfo() {
    document.getElementById('userName').textContent = this.currentUser.name || 'Admin Name';
    document.getElementById('userRole').textContent = this.currentUser.role || 'admin';
    document.getElementById('userAvatar').textContent = (this.currentUser.name || 'A').charAt(0);
  }

  async fetchTasksAndEmployees() {
    try {
      const [tasksResponse, usersResponse] = await Promise.all([
        fetch(`${this.apiBaseUrl}?search=`),
        fetch('/api/users')
      ]);

      if (!tasksResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const tasksData = await tasksResponse.json();
      const usersData = await usersResponse.json();

      this.tasks = tasksData.tasks || [];
      this.employees = usersData.users || [];
      
      this.populateEmployeeFilter();
      this.renderWeeklySchedule();
    } catch (error) {
      console.error('Error fetching data:', error);
      this.showErrorMessage('Failed to load weekly schedule. Please try again later.');
    }
  }

  populateEmployeeFilter() {
    const employeeFilter = document.getElementById('employeeFilterSchedule');
    if (!employeeFilter) return;
    
    const employees = this.employees.filter(emp => emp.role === 'employee');
    
    employeeFilter.innerHTML = '<option value="">All Employees</option>' +
      employees.map(emp => `
        <option value="${emp._id}">${emp.name}</option>
      `).join('');
  }

  initWeekSelector() {
    const weekSelector = document.getElementById('weekSelector');
    if (!weekSelector) return;
    
    const today = new Date();
    const weeks = this.generateWeekOptions();
    
    weekSelector.innerHTML = weeks.map((week, index) => `
      <option value="${index}">${week}</option>
    `).join('');
    
    weekSelector.addEventListener('change', (e) => {
      this.renderWeeklySchedule();
    });
  }

  generateWeekOptions() {
    const weeks = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - 7 * i);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      weeks.unshift({ start: weekStart, end: weekEnd, label: weekLabel });
    }
    
    return weeks;
  }

  renderWeeklySchedule() {
    const weekSelector = document.getElementById('weekSelector');
    const selectedWeekIndex = weekSelector ? weekSelector.value : 0;
    const weeks = this.generateWeekOptions();
    const selectedWeek = weeks[selectedWeekIndex];
    
    const employeeFilter = document.getElementById('employeeFilterSchedule');
    const selectedEmployee = employeeFilter ? employeeFilter.value : '';
    
    const filteredTasks = this.getFilteredTasks(selectedWeek, selectedEmployee);
    this.renderScheduleGrid(filteredTasks, selectedWeek);
  }

  getFilteredTasks(week, employeeId) {
    let filteredTasks = this.tasks.filter(task => {
      const taskDeadline = new Date(task.deadline);
      return taskDeadline >= week.start && taskDeadline <= week.end;
    });
    
    if (employeeId) {
      filteredTasks = filteredTasks.filter(task => 
        task.assignedTo?._id === employeeId
      );
    }
    
    return filteredTasks;
  }

  renderScheduleGrid(tasks, week) {
    const scheduleGrid = document.getElementById('weeklyScheduleGrid');
    if (!scheduleGrid) return;
    
    scheduleGrid.innerHTML = '';
    
    const dayHeaders = document.querySelectorAll('.day-header');
    dayHeaders.forEach((header, index) => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
      header.textContent = dayName;
    });
    
    const dayTasksContainers = document.querySelectorAll('.day-tasks');
    dayTasksContainers.forEach((container, dayIndex) => {
      const dayTasks = tasks.filter(task => {
        const taskDeadline = new Date(task.deadline);
        return taskDeadline.getDay() === dayIndex;
      });
      
      if (dayTasks.length === 0) {
        container.innerHTML = '<div class="empty-day">No tasks</div>';
        return;
      }
      
      container.innerHTML = dayTasks.map(task => this.getTaskCardHTML(task)).join('');
      
      container.querySelectorAll('.task-card-schedule').forEach(card => {
        card.addEventListener('click', () => {
          const taskId = card.dataset.taskId;
          this.openTaskDetails(taskId);
        });
      });
    });
  }

  getTaskCardHTML(task) {
    const statusClass = `status-${task.status}-schedule`;
    const statusText = this.getStatusText(task.status);
    const clientCount = task.relatedClients ? task.relatedClients.length : 0;
    
    const deadlineClass = new Date(task.deadline) < new Date() ? 'deadline-urgent' : '';
    
    return `
      <div class="task-card-schedule" data-task-id="${task._id}">
        <div class="task-title-schedule">${task.title}</div>
        <div class="task-employee-schedule">
          <span>👤</span>
          <span>${task.assignedTo?.name}</span>
        </div>
        <div class="task-deadline-schedule ${deadlineClass}">
          <span>📅</span>
          <span>Due: ${new Date(task.deadline).toLocaleDateString()}</span>
        </div>
        <span class="task-status-badge-schedule ${statusClass}">${statusText}</span>
        <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
          <strong>Clients:</strong> ${clientCount}
        </div>
      </div>
    `;
  }

  getStatusText(status) {
    const statusTexts = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };
    return statusTexts[status] || status;
  }

  showErrorMessage(message) {
    const scheduleGrid = document.getElementById('weeklyScheduleGrid');
    if (!scheduleGrid) return;
    
    scheduleGrid.innerHTML = `
      <div class="empty-state-schedule">
        <div class="empty-icon-schedule">⚠️</div>
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  openTaskDetails(taskId) {
    const task = this.tasks.find(t => t._id === taskId);
    if (!task) return;

    const taskDetailsContent = document.getElementById('taskDetailsContent');
    taskDetailsContent.innerHTML = this.getTaskDetailsHTML(task);

    const modal = document.getElementById('taskDetailsModal');
    modal.style.display = 'flex';

    document.getElementById('closeTaskDetailsModal').onclick = () => {
      modal.style.display = 'none';
    };
  }

  getTaskDetailsHTML(task) {
    const clientsList = task.relatedClients && task.relatedClients.length > 0
      ? task.relatedClients.map(client => `
        <li>
          <strong>${client.name}</strong> - ${client.phone}
        </li>
      `).join('')
      : '<li>No clients assigned</li>';

    return `
      <div class="task-details">
        <div class="task-detail-item">
          <strong>Title:</strong> ${task.title}
        </div>
        <div class="task-detail-item">
          <strong>Description:</strong> ${task.description || 'N/A'}
        </div>
        <div class="task-detail-item">
          <strong>Status:</strong> <span class="task-status-badge-schedule ${task.status}-schedule">
            ${this.getStatusText(task.status)}
          </span>
        </div>
        <div class="task-detail-item">
          <strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}
        </div>
        <div class="task-detail-item">
          <strong>Assigned to:</strong> ${task.assignedTo?.name}
        </div>
        <div class="task-detail-item">
          <strong>Clients (${task.relatedClients?.length || 0}):</strong>
          <ul class="clients-list">
            ${clientsList}
          </ul>
        </div>
      </div>
      <style>
        .task-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .task-detail-item {
          padding: 10px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }
        .task-detail-item strong {
          color: var(--gold);
        }
        .clients-list {
          margin: 10px 0 0 0;
          padding-left: 20px;
        }
        .clients-list li {
          margin: 5px 0;
        }
      </style>
    `;
  }

  setupEventListeners() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      sidebarBackdrop.classList.toggle('active');
    });

    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarBackdrop.classList.remove('active');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
      }
    });
  }

  initSidebar() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const nav = e.currentTarget.dataset.nav;
        if (nav === 'dashboard') {
          window.location.href = 'dashboard.html';
        } else if (nav === 'tasks') {
          window.location.href = 'tasks.html';
        } else if (nav === 'goals') {
          window.location.href = 'employee-goals.html';
        } else if (nav === 'weekly-schedule') {
          window.location.href = 'admin-weekly-schedule.html';
        }
      });
    });
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const weeklySchedule = new AdminWeeklySchedule();

  // Make weekly schedule globally available for debugging
  window.adminWeeklySchedule = weeklySchedule;
});