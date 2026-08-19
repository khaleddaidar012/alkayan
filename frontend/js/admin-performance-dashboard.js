// Admin Performance Dashboard JavaScript
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

let allTasks = [];
let allGoals = [];
let allUsers = [];
let currentPeriod = 'thisWeek';

function getPeriodRange(period) {
  const now = new Date();
  let start, end = new Date(now);

  switch (period) {
    case 'today':
      start = new Date(now); start.setHours(0, 0, 0, 0);
      break;
    case 'thisWeek': {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      break;
    }
    case 'lastWeek': {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay() - 7);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'previousYears':
      start = new Date(2000, 0, 1);
      end = new Date(now.getFullYear(), 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(now); start.setHours(0, 0, 0, 0);
  }
  if (period !== 'lastWeek' && period !== 'lastMonth' && period !== 'previousYears') {
    if (period === 'thisWeek') { end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999); }
    else if (period === 'thisMonth') { end = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }
    else if (period === 'thisYear') { end = new Date(now.getFullYear(), 11, 31); end.setHours(23, 59, 59, 999); }
    else end = new Date(now); end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function inRange(date, range) {
  const d = new Date(date);
  return d >= range.start && d <= range.end;
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  if (!token) { redirectToLogin(); return null; }
  try {
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) { redirectToLogin(); return null; }
      throw new Error(data.message || 'Request failed');
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function loadAll() {
  const [tasksData, goalsData, usersData] = await Promise.all([
    apiFetch('/tasks'),
    apiFetch('/goals'),
    apiFetch('/users')
  ]);
  allTasks = tasksData?.tasks || [];
  allGoals = goalsData?.goals || [];
  allUsers = usersData?.users || [];
  renderAll();
}

function renderStats() {
  const range = getPeriodRange(currentPeriod);
  const periodTasks = allTasks.filter(t => inRange(t.createdAt || t.deadline, range));
  const deadlineTasks = allTasks.filter(t => inRange(t.deadline, range));

  const total = deadlineTasks.length;
  const completed = deadlineTasks.filter(t => t.status === 'completed').length;
  const pending = deadlineTasks.filter(t => t.status === 'pending').length;
  const late = deadlineTasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const goalRange = { start: range.start, end: range.end };
  const periodGoals = allGoals.filter(g => inRange(g.createdAt, goalRange));
  const goalCompleted = periodGoals.filter(g => g.completed).length;
  const goalRate = periodGoals.length > 0 ? Math.round((goalCompleted / periodGoals.length) * 100) : 0;

  document.getElementById('totalTasksStat').textContent = total;
  document.getElementById('completedTasksStat').textContent = completed;
  document.getElementById('pendingTasksStat').textContent = pending;
  document.getElementById('lateTasksStat').textContent = late;
  document.getElementById('completionRateStat').textContent = completionRate + '%';
  document.getElementById('goalCompletionRateStat').textContent = goalRate + '%';
}

function renderStatusChart() {
  const container = document.getElementById('statusChartContainer');
  if (!container) return;
  const range = getPeriodRange(currentPeriod);
  const tasks = allTasks.filter(t => inRange(t.deadline, range));

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };
  const max = Math.max(counts.pending, counts.in_progress, counts.completed, 1);

  const colors = { pending: '#F59E0B', in_progress: '#3B82F6', completed: '#10B981' };
  const labels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };

  container.innerHTML = `
    <div style="display:flex;gap:24px;align-items:flex-end;justify-content:center;height:180px;padding:10px;">
      ${['pending', 'in_progress', 'completed'].map(s => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:120px;">
          <span style="font-weight:700;font-size:16px;color:var(--text-primary);">${counts[s]}</span>
          <div style="width:100%;background:var(--bg-secondary);border-radius:6px;overflow:hidden;height:120px;display:flex;align-items:flex-end;">
            <div style="width:100%;height:${Math.round((counts[s] / max) * 100)}%;background:${colors[s]};border-radius:6px;transition:height .3s;"></div>
          </div>
          <span style="font-size:12px;color:var(--text-secondary);">${labels[s]}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTrendChart() {
  const container = document.getElementById('trendChartContainer');
  if (!container) return;

  const days = [];
  const labels = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
    labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
  }

  const counts = days.map(day => {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return allTasks.filter(t => {
      const created = new Date(t.createdAt || t.deadline);
      return created >= day && created < next;
    }).length;
  });

  const max = Math.max(...counts, 1);

  container.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-end;justify-content:center;height:180px;padding:10px;">
      ${counts.map((c, i) => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
          <span style="font-size:12px;color:var(--text-primary);">${c}</span>
          <div style="width:100%;background:var(--bg-secondary);border-radius:6px;overflow:hidden;height:120px;display:flex;align-items:flex-end;">
            <div style="width:100%;height:${Math.round((c / max) * 100)}%;background:var(--gold);border-radius:6px;transition:height .3s;"></div>
          </div>
          <span style="font-size:11px;color:var(--text-secondary);">${labels[i]}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEmployeeTable() {
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;
  const range = getPeriodRange(currentPeriod);

  const employees = allUsers.filter(u => u.role === 'employee' || u.role === 'manager');
  const rows = employees.map(emp => {
    const assigned = allTasks.filter(t => String(t.assignedTo?._id || t.assignedTo) === String(emp._id));
    const periodAssigned = assigned.filter(t => inRange(t.deadline, range));
    const completedCount = periodAssigned.filter(t => t.status === 'completed').length;
    const createdCount = assigned.filter(t => String(t.createdBy?._id || t.createdBy) === String(emp._id)).length;
    const completionRate = periodAssigned.length > 0 ? Math.round((completedCount / periodAssigned.length) * 100) : 0;

    const days = Math.max(1, Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24)));
    const avgPerDay = (periodAssigned.length / days).toFixed(1);
    const score = Math.min(100, Math.round(completionRate * 0.7 + (periodAssigned.length > 0 ? 30 : 0)));

    return { name: emp.name, completed: completedCount, created: createdCount, rate: completionRate, avg: avgPerDay, score };
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<div class="loading-row"><div class="loading-message">No employee data available</div></div>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <div class="table-row">
      <div class="table-cell">${escapeHtml(r.name)}</div>
      <div class="table-cell">${r.completed}</div>
      <div class="table-cell">${r.created}</div>
      <div class="table-cell">${r.rate}%</div>
      <div class="table-cell">${r.avg}</div>
      <div class="table-cell"><span class="performance-score" style="color:${r.score >= 70 ? 'var(--success)' : r.score >= 40 ? 'var(--gold)' : 'var(--danger)'};font-weight:700;">${r.score}/100</span></div>
    </div>
  `).join('');
}

function renderGoalCompletion() {
  const periods = ['daily', 'weekly', 'monthly'];
  periods.forEach(period => {
    const goals = allGoals.filter(g => g.period === period);
    const completed = goals.filter(g => g.completed).length;
    const rate = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
    const setEl = document.getElementById(period + 'GoalsSet');
    const doneEl = document.getElementById(period + 'GoalsCompleted');
    const rateEl = document.getElementById(period + 'GoalsRate');
    if (setEl) setEl.textContent = goals.length;
    if (doneEl) doneEl.textContent = completed;
    if (rateEl) rateEl.textContent = rate + '%';
  });
}

function renderAll() {
  renderStats();
  renderStatusChart();
  renderTrendChart();
  renderEmployeeTable();
  renderGoalCompletion();
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

  initI18n('admin-performance-dashboard', 'admin-performance-dashboard');
  initTheme();

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (avatar) avatar.textContent = (user.name || 'A').charAt(0).toUpperCase();
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

  document.querySelectorAll('.period-btn[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderAll();
    });
  });

  const toggleTable = document.getElementById('toggleEmployeeTable');
  if (toggleTable) {
    toggleTable.addEventListener('click', () => {
      const table = document.getElementById('employeePerformanceTable');
      if (table) table.style.display = table.style.display === 'none' ? 'block' : 'none';
    });
  }

  const toggleGoal = document.getElementById('toggleGoalDetails');
  if (toggleGoal) {
    toggleGoal.addEventListener('click', () => {
      const grid = document.getElementById('goalCompletionGrid');
      if (grid) grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
    });
  }

  const closeAnalytics = document.getElementById('closeAnalyticsModal');
  if (closeAnalytics) {
    closeAnalytics.addEventListener('click', () => {
      document.getElementById('analyticsModal').style.display = 'none';
    });
  }

  loadAll();
}

document.addEventListener('DOMContentLoaded', init);