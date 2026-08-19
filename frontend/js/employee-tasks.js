// Employee Tasks Dashboard JavaScript - Phase 4.1
const API_URL = 'http://localhost:5000/api';

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('alkayan_user')); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

class EmployeeTasksDashboard {
  constructor() {
    this.currentUser = getCurrentUser() || {
      name: 'Employee Name',
      role: 'employee'
    };
    this.tasks = [];
    this.apiBaseUrl = '/api/tasks';
    this.init();
  }

  init() {
    this.updateUserInfo();
    this.fetchTasks();
    this.setupEventListeners();
    this.initSidebar();
  }

  updateUserInfo() {
    document.getElementById('userName').textContent = this.currentUser.name || 'Employee Name';
    document.getElementById('userRole').textContent = this.currentUser.role || 'employee';
    document.getElementById('userAvatar').textContent = (this.currentUser.name || 'E').charAt(0);
  }

  async fetchTasks() {
    try {
      const token = getToken();
      if (!token) { window.location.href = 'login.html'; return; }
      const response = await fetch(`${this.apiBaseUrl}?assignedTo=${this.currentUser._id || 1}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      this.tasks = data.tasks || [];
      this.displayTasks();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      this.showTasksError('Failed to load tasks. Please try again later.');
    }
  }

  displayTasks() {
    const todayTasks = this.getTasksForToday();
    const weekTasks = this.getTasksForThisWeek();
    const completedTasks = this.getCompletedTasks();

    this.renderTasksSection('#todayTasksGrid', todayTasks, 'today');
    this.renderTasksSection('#weekTasksGrid', weekTasks, 'week');
    this.renderTasksSection('#completedTasksGrid', completedTasks, 'completed');
  }

  getTasksForToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return taskDate >= today && task.status !== 'completed';
    });
  }

  getTasksForThisWeek() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return this.tasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return taskDate >= weekStart && taskDate <= weekEnd && task.status === 'in_progress';
    });
  }

  getCompletedTasks() {
    return this.tasks.filter(task => task.status === 'completed');
  }

  renderTasksSection(containerSelector, tasks, sectionType) {
    const container = document.querySelector(containerSelector);
    
    if (tasks.length === 0) {
      container.innerHTML = this.getEmptyStateHTML(sectionType);
      return;
    }
    
    container.innerHTML = tasks.map(task => this.getTaskCardHTML(task)).join('');
    
    container.querySelectorAll('.task-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.currentTarget.dataset.taskId;
        const action = e.currentTarget.dataset.action;
        this.handleTaskAction(taskId, action, e.currentTarget);
      });
    });
    
    container.querySelectorAll('.task-card-employee').forEach(card => {
      card.addEventListener('click', () => {
        const taskId = card.dataset.taskId;
        this.openTaskDetails(taskId);
      });
    });
  }

  getTaskCardHTML(task) {
    const statusClass = `status-${task.status}-employee`;
    const statusText = this.getStatusText(task.status);
    const clientCount = task.relatedClients ? task.relatedClients.length : 0;
    const progress = this.calculateProgress(task.status);
    const hasProof = task.proofType || task.proofContent;
    
    return `
      <div class="task-card-employee" data-task-id="${task._id}">
        <div class="task-card-header-employee">
          <h3 class="task-title-employee">${task.title}</h3>
          <span class="task-status-badge-employee ${statusClass}">${statusText}</span>
        </div>
        <div class="task-meta-employee">
          <div class="task-clients-employee">
            <span>👥</span>
            <span>${clientCount} client${clientCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="task-deadline-employee">
            <span>📅</span>
            <span>Deadline: ${new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          ${hasProof ? `
          <div class="task-proof-employee">
            <span class="task-proof-icon-employee">✅</span>
            <span>Proof submitted</span>
          </div>
          ` : ''}
        </div>
        <div class="task-progress-employee">
          <div class="progress-bar-employee">
            <div class="progress-fill-employee" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text-employee">Progress: ${progress}%</span>
        </div>
        <div class="form-actions" style="margin-top: 15px; justify-content: flex-end;">
          ${task.status !== 'completed' ? `
          <button class="btn-primary" data-task-id="${task._id}" data-action="updateStatus" style="padding: 8px 16px; font-size: 13px;">Update Status</button>
          ` : ''}
          ${!hasProof && task.status === 'completed' ? `
          <button class="btn-secondary" data-task-id="${task._id}" data-action="submitProof" style="padding: 8px 16px; font-size: 13px;">Submit Proof</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getEmptyStateHTML(sectionType) {
    const messages = {
      today: 'No tasks for today',
      week: 'No tasks this week',
      completed: 'No completed tasks'
    };
    
    return `
      <div class="empty-state-employee">
        <div class="empty-icon-employee">📋</div>
        <h3>No ${messages[sectionType]}</h3>
        <p>Great job! You don't have any tasks in this category.</p>
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

  calculateProgress(status) {
    const progressMap = {
      'pending': 0,
      'in_progress': 50,
      'completed': 100
    };
    return progressMap[status] || 0;
  }

  showTasksError(message) {
    const containers = ['#todayTasksGrid', '#weekTasksGrid', '#completedTasksGrid'];
    containers.forEach(selector => {
      const container = document.querySelector(selector);
      if (container && container.innerHTML.includes('loading-message')) {
        container.innerHTML = `
          <div class="empty-state-employee">
            <div class="empty-icon-employee">⚠️</div>
            <h3>Error</h3>
            <p>${message}</p>
          </div>
        `;
      }
    });
  }

  handleTaskAction(taskId, action, buttonElement) {
    const task = this.tasks.find(t => t._id === taskId);
    if (!task) return;
    
    switch (action) {
      case 'updateStatus':
        this.openStatusUpdateModal(task);
        break;
      case 'submitProof':
        this.openProofModal(task);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  openStatusUpdateModal(task) {
    const newStatus = prompt(
      `Update status for task: "${task.title}"\n\nCurrent status: ${this.getStatusText(task.status)}\n\nEnter new status (pending/in_progress/completed):`,
      task.status
    );
    
    if (newStatus && ['pending', 'in_progress', 'completed'].includes(newStatus)) {
      this.updateTaskStatus(task._id, newStatus);
    } else if (newStatus) {
      alert('Invalid status. Please use: pending, in_progress, or completed');
    }
  }

  async updateTaskStatus(taskId, newStatus) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      const updatedTask = await response.json();
      
      this.tasks = this.tasks.map(task => 
        task._id === taskId ? updatedTask.task : task
      );
      
      this.displayTasks();
      this.showNotification('Task status updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error updating task status:', error);
      this.showNotification('Failed to update task status. Please try again.', 'error');
    }
  }

  async submitProof(task) {
    const proofData = {
      status: 'completed',
      proofType: 'text',
      proofContent: 'Task completed successfully.'
    };
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/${task._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(proofData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit proof');
      }
      
      const updatedTask = await response.json();
      
      this.tasks = this.tasks.map(t => 
        t._id === task._id ? updatedTask.task : t
      );
      
      this.displayTasks();
      this.showNotification('Proof submitted successfully!', 'success');
      
    } catch (error) {
      console.error('Error submitting proof:', error);
      this.showNotification('Failed to submit proof. Please try again.', 'error');
    }
  }

  openProofModal(task) {
    const modal = document.getElementById('proofModal');
    const form = document.getElementById('proofForm');
    const taskIdInput = document.getElementById('proofTaskId');
    
    taskIdInput.value = task._id;
    modal.style.display = 'flex';
    
    const closeModal = () => {
      modal.style.display = 'none';
      form.reset();
      document.getElementById('textProofGroup').style.display = 'none';
      document.getElementById('imageProofGroup').style.display = 'none';
    };
    
    document.getElementById('cancelProof').onclick = closeModal;
    
    form.onsubmit = async (e) => {
      e.preventDefault();
      await this.submitProof(task);
      closeModal();
    };
    
    document.getElementById('proofType').onchange = (e) => {
      document.getElementById('textProofGroup').style.display = e.target.value === 'text' ? 'block' : 'none';
      document.getElementById('imageProofGroup').style.display = e.target.value === 'image' ? 'block' : 'none';
    };
  }

  openTaskDetails(taskId) {
    const task = this.tasks.find(t => t._id === taskId);
    if (!task) return;
    
    const detailsContent = document.getElementById('taskDetailsContent');
    detailsContent.innerHTML = this.getTaskDetailsHTML(task);
    
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
    
    const campaignInfo = task.relatedCampaign ? `
      <div class="task-detail-item">
        <strong>Campaign:</strong> ${task.relatedCampaign.name}
      </div>
    ` : '';
    
    const programInfo = task.relatedProgram ? `
      <div class="task-detail-item">
        <strong>Program:</strong> ${task.relatedProgram.name}
      </div>
    ` : '';
    
    const proofInfo = task.proofType ? `
      <div class="task-detail-item">
        <strong>Proof Type:</strong> ${task.proofType}
      </div>
      ${task.proofContent ? `
        <div class="task-detail-item">
          <strong>Proof Content:</strong> ${task.proofContent}
        </div>
      ` : ''}
    ` : '<div class="task-detail-item"><strong>Proof:</strong> Not submitted</div>';
    
    return `
      <div class="task-details">
        <div class="task-detail-item">
          <strong>Title:</strong> ${task.title}
        </div>
        <div class="task-detail-item">
          <strong>Description:</strong> ${task.description || 'N/A'}
        </div>
        <div class="task-detail-item">
          <strong>Status:</strong> <span class="task-status-badge-employee ${task.status}-employee">
            ${this.getStatusText(task.status)}
          </span>
        </div>
        <div class="task-detail-item">
          <strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}
        </div>
        <div class="task-detail-item">
          <strong>Assigned to:</strong> ${task.assignedTo?.name}
        </div>
        ${campaignInfo}
        ${programInfo}
        <div class="task-detail-item">
          <strong>Clients (${task.relatedClients?.length || 0}):</strong>
          <ul class="clients-list">
            ${clientsList}
          </ul>
        </div>
        ${proofInfo}
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
        }
      });
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new EmployeeTasksDashboard();
  
  // Make dashboard globally available for debugging
  window.employeeTasksDashboard = dashboard;
});