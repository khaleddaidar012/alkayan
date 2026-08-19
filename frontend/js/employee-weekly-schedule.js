// Employee Weekly Schedule Controller
const API_URL = 'http://localhost:5000/api';

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('alkayan_user')); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showNotification(message, type = 'info') {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  const notification = document.createElement('div');
  notification.className = 'notification notification-' + type;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

let myTasks = [];

const STATUS_TEXT = {
  'pending': 'Pending',
  'in_progress': 'In Progress',
  'completed': 'Completed'
};

function getStatusText(status) {
  return STATUS_TEXT[status] || status || 'Unknown';
}

function getDayName(index) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

async function fetchMyTasks() {
  const token = getToken();
  if (!token) { redirectToLogin(); return; }
  const user = getCurrentUser();
  try {
    const response = await fetch(`${API_URL}/tasks?assignedTo=${user?._id || ''}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 401) { redirectToLogin(); return; }
      throw new Error('Failed to fetch tasks');
    }
    const data = await response.json();
    myTasks = data.tasks || [];
    renderSchedule();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    const day = document.getElementById('day-0-tasks-employee');
    if (day) day.innerHTML = '<div class="loading-message-employee">Failed to load tasks. Please try again.</div>';
  }
}

function getWeekTasks() {
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return myTasks.filter(task => {
    const d = new Date(task.deadline);
    return d >= weekStart && d <= weekEnd;
  });
}

function renderOverview() {
  const weekTasks = getWeekTasks();
  const total = weekTasks.length;
  const pending = weekTasks.filter(t => t.status === 'pending').length;
  const inProgress = weekTasks.filter(t => t.status === 'in_progress').length;
  const completed = weekTasks.filter(t => t.status === 'completed').length;

  document.getElementById('totalTasks').textContent = total;
  document.getElementById('pendingTasks').textContent = pending;
  document.getElementById('inProgressTasks').textContent = inProgress;
  document.getElementById('completedTasks').textContent = completed;
}

function getTaskCardHTML(task) {
  const statusClass = `status-${task.status}-employee`;
  const overdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
  const clientCount = task.relatedClients ? task.relatedClients.length : 0;
  const employeeName = task.assignedTo?.name || 'Unassigned';

  return `
    <div class="task-card-employee" data-task-id="${task._id}" title="${escapeHtml(task.title)}">
      <div class="task-title-employee">${escapeHtml(task.title)}</div>
      <div class="task-employee"><span>👤</span><span>${escapeHtml(employeeName)}</span></div>
      <div class="task-deadline-employee ${overdue ? '' : ''}">
        <span>📅</span><span>${new Date(task.deadline).toLocaleDateString()}</span>
      </div>
      <div style="margin:6px 0;font-size:12px;color:var(--text-secondary);">👥 ${clientCount} client${clientCount !== 1 ? 's' : ''}</div>
      <span class="task-status-badge-employee ${statusClass}">${getStatusText(task.status)}</span>
    </div>
  `;
}

function renderScheduleGrid() {
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekTasks = myTasks.filter(task => {
    const d = new Date(task.deadline);
    return d >= weekStart && d <= weekEnd;
  });

  for (let day = 0; day < 7; day++) {
    const container = document.getElementById(`day-${day}-tasks-employee`);
    if (!container) continue;
    const dayTasks = weekTasks.filter(task => new Date(task.deadline).getDay() === day);
    const dayName = getDayName(day);
    if (dayTasks.length === 0) {
      container.innerHTML = `<div class="empty-day-employee">No tasks — ${dayName}</div>`;
      continue;
    }
    container.innerHTML = dayTasks.map(task => getTaskCardHTML(task)).join('');
    container.querySelectorAll('.task-card-employee').forEach(card => {
      card.addEventListener('click', () => openTaskDetails(card.dataset.taskId));
    });
  }
}

function renderStatistics() {
  const weekTasks = getWeekTasks();
  const completedCount = weekTasks.filter(t => t.status === 'completed').length;
  const total = weekTasks.length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  document.getElementById('completionRate').textContent = completionRate + '%';
  const bar = document.getElementById('completionBar');
  if (bar) bar.style.width = completionRate + '%';

  const now = new Date();
  const daysWithTasks = new Set(weekTasks.map(t => new Date(t.deadline).getDate())).size;
  document.getElementById('avgDailyTasks').textContent = daysWithTasks > 0 ? (weekTasks.length / daysWithTasks).toFixed(1) : '0';

  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const threeDays = new Date(nowDate);
  threeDays.setDate(nowDate.getDate() + 3);
  const upcoming = weekTasks.filter(t =>
    t.status !== 'completed' &&
    new Date(t.deadline) >= nowDate &&
    new Date(t.deadline) <= threeDays
  ).length;
  document.getElementById('highPriorityTasks').textContent = upcoming;

  const weekEnd = new Date(startOfWeek(new Date()));
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const upcomingDeadlines = weekTasks.filter(t =>
    t.status !== 'completed' && new Date(t.deadline) <= weekEnd
  ).length;
  document.getElementById('upcomingDeadlines').textContent = upcomingDeadlines;
}

function renderSchedule() {
  renderOverview();
  renderScheduleGrid();
  renderStatistics();
}

function getTaskDetailsHTML(task) {
  const clientsList = task.relatedClients && task.relatedClients.length > 0
    ? task.relatedClients.map(client => `<li><strong>${escapeHtml(client.name)}</strong> - ${escapeHtml(client.phone || '')}</li>`).join('')
    : '<li>No clients assigned</li>';

  const campaignInfo = task.relatedCampaign ? `
    <div class="task-detail-item"><strong>Campaign:</strong> ${escapeHtml(task.relatedCampaign.name)}</div>
  ` : '';
  const programInfo = task.relatedProgram ? `
    <div class="task-detail-item"><strong>Program:</strong> ${escapeHtml(task.relatedProgram.name)}</div>
  ` : '';

  return `
    <div class="task-details">
      <div class="task-detail-item"><strong>Title:</strong> ${escapeHtml(task.title)}</div>
      <div class="task-detail-item"><strong>Status:</strong> <span class="task-status-badge-employee status-${task.status}-employee">${getStatusText(task.status)}</span></div>
      <div class="task-detail-item"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</div>
      <div class="task-detail-item"><strong>Assigned to:</strong> ${escapeHtml(task.assignedTo?.name || 'Unassigned')}</div>
      ${campaignInfo}
      ${programInfo}
      <div class="task-detail-item"><strong>Clients (${task.relatedClients?.length || 0}):</strong><ul class="clients-list">${clientsList}</ul></div>
    </div>
    <style>
      .task-details { display:grid; grid-template-columns:1fr 1fr; gap:15px; }
      .task-detail-item { padding:10px; background:var(--bg-secondary); border-radius:var(--radius-sm); }
      .task-detail-item strong { color:var(--gold); }
      .clients-list { margin:10px 0 0 0; padding-left:20px; }
      .clients-list li { margin:5px 0; }
    </style>
  `;
}

function openTaskDetails(taskId) {
  const task = myTasks.find(t => t._id === taskId);
  if (!task) return;
  const content = document.getElementById('taskDetailsContent');
  const modal = document.getElementById('taskDetailsModal');
  if (!content || !modal) return;
  content.innerHTML = getTaskDetailsHTML(task);
  modal.style.display = 'flex';
  document.getElementById('closeTaskDetailsModal').onclick = () => { modal.style.display = 'none'; };
  modal.addEventListener('click', e => {
    if (e.target === e.currentTarget) modal.style.display = 'none';
  });
}

function initSidebar() {
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', function () {
      const page = this.dataset.nav;
      if (page) window.location.href = `${page}.html`;
    });
  });

  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (hamburger && sidebar && backdrop) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    };
    hamburger.addEventListener('click', toggleSidebar);
    backdrop.addEventListener('click', toggleSidebar);
  }
}

function init() {
  const token = getToken();
  const user = getCurrentUser();
  if (!token || !user) { redirectToLogin(); return; }

  initI18n('employee-weekly-schedule', 'employee-weekly-schedule');
  initTheme();

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (avatar) avatar.textContent = (user.name || 'E').charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name || '';
  if (roleEl) roleEl.textContent = user.role || '';

  initSidebar();

  const langBtn = document.getElementById('langToggle2');
  if (langBtn) langBtn.addEventListener('click', switchLang);

  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('alkayan_token');
      sessionStorage.removeItem('alkayan_token');
      localStorage.removeItem('alkayan_user');
      redirectToLogin();
    });
  }

  fetchMyTasks();
}

document.addEventListener('DOMContentLoaded', init);
