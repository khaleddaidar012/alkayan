// Employee Goals Dashboard Controller
const API_URL = 'http://localhost:5000/api';

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('alkayan_user')); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

class EmployeeGoalsDashboard {
  constructor() {
    this.currentUser = getCurrentUser() || {
      name: 'Employee Name',
      role: 'employee'
    };
    this.goals = [];
    this.apiBaseUrl = '/api/goals';
    this.init();
  }

  init() {
    this.updateUserInfo();
    this.fetchGoals();
    this.setupEventListeners();
    this.initSidebar();
  }

  updateUserInfo() {
    document.getElementById('userName').textContent = this.currentUser.name || 'Employee Name';
    document.getElementById('userRole').textContent = this.currentUser.role || 'employee';
    document.getElementById('userAvatar').textContent = (this.currentUser.name || 'E').charAt(0);
  }

  async fetchGoals() {
    try {
      const token = getToken();
      if (!token) { window.location.href = 'login.html'; return; }
      const response = await fetch(`${this.apiBaseUrl}?employee=${this.currentUser._id || 1}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      this.goals = data.goals || [];
      this.displayGoals();
    } catch (error) {
      console.error('Error fetching goals:', error);
      this.showGoalsError('Failed to load goals. Please try again later.');
    }
  }

  displayGoals() {
    const dailyGoals = this.getGoalsByPeriod('daily');
    const weeklyGoals = this.getGoalsByPeriod('weekly');
    const monthlyGoals = this.getGoalsByPeriod('monthly');

    this.renderGoalsSection('#dailyGoalsGrid', dailyGoals, 'daily');
    this.renderGoalsSection('#weeklyGoalsGrid', weeklyGoals, 'weekly');
    this.renderGoalsSection('#monthlyGoalsGrid', monthlyGoals, 'monthly');

    this.updateGoalsCount(dailyGoals, weeklyGoals, monthlyGoals);
  }

  getGoalsByPeriod(period) {
    return this.goals.filter(goal => goal.period === period);
  }

  renderGoalsSection(containerSelector, goals, period) {
    const container = document.querySelector(containerSelector);

    if (goals.length === 0) {
      container.innerHTML = this.getEmptyGoalsHTML(period);
      return;
    }

    container.innerHTML = goals.map(goal => this.getGoalCardHTML(goal)).join('');

    container.querySelectorAll('.checklist-item-employee').forEach(item => {
      item.addEventListener('click', () => {
        const goalId = item.closest('.goal-card-employee').dataset.goalId;
        const checklistIndex = item.dataset.checklistIndex;
        this.toggleChecklistItem(goalId, checklistIndex);
      });
    });

    container.querySelectorAll('.goal-card-employee').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.checklist-item-employee')) return;
        const goalId = card.dataset.goalId;
        this.openGoalDetails(goalId);
      });
    });
  }

  async toggleChecklistItem(goalId, checklistIndex) {
    const goal = this.goals.find(g => g._id === goalId);
    if (!goal || !goal.checklist || !goal.checklist[checklistIndex]) return;

    const wasCompleted = goal.completed;
    const newCompleted = !wasCompleted;

    try {
      const token = getToken();
      if (!token) { window.location.href = 'login.html'; return; }
      const response = await fetch(`${this.apiBaseUrl}/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: newCompleted })
      });
      if (!response.ok) throw new Error('Failed to update goal');

      const data = await response.json();
      this.goals = this.goals.map(g => g._id === goalId ? data.goal : g);
      this.displayGoals();
      this.showNotification('Goal status updated!', 'success');
    } catch (error) {
      console.error('Error updating goal:', error);
      this.showNotification('Failed to update goal. Please try again.', 'error');
    }
  }

  getGoalCardHTML(goal) {
    const periodClass = `period-${goal.period}-employee`;
    const periodText = goal.period.charAt(0).toUpperCase() + goal.period.slice(1);
    const completedCount = this.getCompletedChecklistCount(goal);
    const totalCount = goal.checklist ? goal.checklist.length : 0;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const checklistItems = goal.checklist && goal.checklist.length > 0
      ? goal.checklist.map((item, index) => `
        <div class="checklist-item-employee ${goal.completed ? 'completed' : ''}" data-checklist-index="${index}">
          <span class="checklist-icon-employee">${goal.completed ? '✅' : '☐'}</span>
          <span class="checklist-text-employee ${goal.completed ? 'completed' : ''}">${item}</span>
        </div>
      `).join('')
      : '<p class="empty-checklist">No checklist items</p>';

    return `
      <div class="goal-card-employee ${goal.completed ? 'completed' : ''}" data-goal-id="${goal._id}">
        <div class="goal-card-header-employee">
          <h3 class="goal-title-employee">${goal.title}</h3>
          <span class="goal-period-badge-employee ${periodClass}">${periodText}</span>
        </div>
        <div class="goal-progress-employee">
          <div class="goal-progress-bar-employee">
            <div class="goal-progress-fill-employee" style="width: ${progress}%"></div>
          </div>
          <span class="goal-progress-text-employee">Progress: ${progress}% (${completedCount}/${totalCount})</span>
        </div>
        <div class="checklist-employee">
          <span class="checklist-title-employee">📝 Checklist:</span>
          <div class="checklist-items-employee">
            ${checklistItems}
          </div>
        </div>
      </div>
    `;
  }

  getCompletedChecklistCount(goal) {
    if (!goal) return 0;
    const total = goal.checklist ? goal.checklist.length : 0;
    return goal.completed ? total : 0;
  }

  getEmptyGoalsHTML(period) {
    const messages = {
      daily: 'No daily goals set',
      weekly: 'No weekly goals set',
      monthly: 'No monthly goals set'
    };

    return `
      <div class="empty-state-employee">
        <div class="empty-icon-employee">🎯</div>
        <h3>No ${period} goals</h3>
        <p>${messages[period]}</p>
      </div>
    `;
  }

  updateGoalsCount(dailyGoals, weeklyGoals, monthlyGoals) {
    const dailyCount = dailyGoals.reduce((total, goal) => total + this.getCompletedChecklistCount(goal), 0);
    const weeklyCount = weeklyGoals.reduce((total, goal) => total + this.getCompletedChecklistCount(goal), 0);
    const monthlyCount = monthlyGoals.reduce((total, goal) => total + this.getCompletedChecklistCount(goal), 0);

    document.getElementById('dailyGoalsCount').textContent = `${dailyCount} completed`;
    document.getElementById('weeklyGoalsCount').textContent = `${weeklyCount} completed`;
    document.getElementById('monthlyGoalsCount').textContent = `${monthlyCount} completed`;
  }

  showGoalsError(message) {
    const containers = ['#dailyGoalsGrid', '#weeklyGoalsGrid', '#monthlyGoalsGrid'];
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

  openGoalDetails(goalId) {
    const goal = this.goals.find(g => g._id === goalId);
    if (!goal) return;

    const detailsContent = document.getElementById('taskDetailsContent');
    detailsContent.innerHTML = this.getGoalDetailsHTML(goal);

    const modal = document.getElementById('taskDetailsModal');
    modal.style.display = 'flex';

    document.getElementById('closeTaskDetailsModal').onclick = () => {
      modal.style.display = 'none';
    };
  }

  getGoalDetailsHTML(goal) {
    const checklistItems = goal.checklist && goal.checklist.length > 0
      ? goal.checklist.map((item, index) => `
        <div class="checklist-detail-item">
          <span class="checklist-detail-icon">${goal.completed ? '✅' : '☐'}</span>
          <span class="checklist-detail-text ${goal.completed ? 'completed' : ''}">${item}</span>
        </div>
      `).join('')
      : '<p class="empty-checklist">No checklist items</p>';

    return `
      <div class="goal-details">
        <div class="goal-detail-item">
          <strong>Title:</strong> ${goal.title}
        </div>
        <div class="goal-detail-item">
          <strong>Period:</strong> <span class="goal-period-badge-employee ${goal.period}-employee">
            ${goal.period.charAt(0).toUpperCase() + goal.period.slice(1)}
          </span>
        </div>
        <div class="goal-detail-item">
          <strong>Created:</strong> ${new Date(goal.createdAt).toLocaleDateString()}
        </div>
        <div class="goal-detail-item">
          <strong>Created by:</strong> ${goal.createdBy?.name}
        </div>
        <div class="goal-detail-item">
          <strong>Progress:</strong> ${this.getCompletedChecklistCount(goal)} / ${goal.checklist?.length || 0} items
        </div>
        <div class="goal-detail-item">
          <strong>Checklist:</strong>
          <div class="checklist-detail">
            ${checklistItems}
          </div>
        </div>
      </div>
      <style>
        .goal-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .goal-detail-item {
          padding: 10px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }
        .goal-detail-item strong {
          color: var(--gold);
        }
        .checklist-detail {
          margin-top: 10px;
        }
        .checklist-detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: var(--bg-card);
          border-radius: var(--radius-sm);
          margin-bottom: 5px;
        }
        .checklist-detail-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }
        .checklist-detail-text {
          flex: 1;
        }
        .checklist-detail-text.completed {
          text-decoration: line-through;
          opacity: 0.6;
        }
        .empty-checklist {
          color: var(--text-secondary);
          font-style: italic;
          padding: 10px;
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

    document.querySelectorAll('#addGoalForm input[name="title"]').forEach(input => {
      input.addEventListener('input', () => {
        if (input.value.length > 50) {
          input.setCustomValidity('Title must be 50 characters or less');
        } else {
          input.setCustomValidity('');
        }
      });
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
  const goalsDashboard = new EmployeeGoalsDashboard();

  // Make dashboard globally available for debugging
  window.employeeGoalsDashboard = goalsDashboard;
});