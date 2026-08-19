// Admin Goals Management JavaScript
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

let allGoals = [];
let allEmployees = [];
let editingGoalId = null;

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
      if (res.status === 401) {
        localStorage.removeItem('alkayan_token');
        sessionStorage.removeItem('alkayan_token');
        localStorage.removeItem('alkayan_user');
        redirectToLogin();
        return null;
      }
      throw new Error(data.message || 'Request failed');
    }
    return data;
  } catch (error) {
    showNotification(error.message || 'Request failed', 'error');
    return null;
  }
}

async function loadEmployees() {
  const data = await apiFetch('/users');
  if (!data) return;
  const users = data.users || [];
  allEmployees = users.filter(u => u.role === 'employee' || u.role === 'manager');
  const employeeFilter = document.getElementById('employeeFilter');
  const formSelect = document.querySelector('#goalForm select[name="employee"]');
  if (employeeFilter) {
    employeeFilter.innerHTML = '<option value="">All Employees</option>' +
      allEmployees.map(u => `<option value="${u._id}">${escapeHtml(u.name)}</option>`).join('');
  }
  if (formSelect) {
    formSelect.innerHTML = '<option value="">Select Employee</option>' +
      allEmployees.map(u => `<option value="${u._id}">${escapeHtml(u.name)}</option>`).join('');
  }
}

async function loadGoals() {
  const search = (document.getElementById('goalSearch')?.value.trim() || '').toLowerCase();
  const employee = document.getElementById('employeeFilter')?.value || '';
  const period = document.getElementById('periodFilter')?.value || '';
  const completed = document.getElementById('completedFilter')?.value || '';

  const params = new URLSearchParams();
  if (employee) params.set('employee', employee);
  if (period) params.set('period', period);
  if (completed !== '') params.set('completed', completed);

  const qs = params.toString();
  const data = await apiFetch(`/goals${qs ? '?' + qs : ''}`);
  if (!data) return;
  let goals = data.goals || [];
  if (search) {
    goals = goals.filter(g =>
      (g.title || '').toLowerCase().includes(search) ||
      (g.employee?.name || '').toLowerCase().includes(search)
    );
  }
  allGoals = goals;
  renderGoals();
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  const emptyState = document.getElementById('emptyState');
  if (!grid) return;

  if (allGoals.length === 0) {
    grid.innerHTML = '<div class="loading-message-admin">No goals found</div>';
    grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  grid.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = allGoals.map(goal => `
    <div class="goal-card-admin" data-goal-id="${goal._id}">
      <div class="goal-card-header-admin">
        <h3 class="goal-title-admin">${escapeHtml(goal.title)}</h3>
        <span class="goal-period-badge-admin period-${goal.period}-admin">${escapeHtml(goal.period)}</span>
      </div>
      <div class="goal-employee-admin">
        <span>👤</span>
        <span>${escapeHtml(goal.employee?.name || 'Unassigned')}</span>
      </div>
      <div class="goal-employee-admin">
        <span>${goal.completed ? '✅' : '⏳'}</span>
        <span>${goal.completed ? 'Completed' : 'Not Completed'}</span>
      </div>
      <div class="goal-checklist-admin">
        <span class="goal-checklist-title-admin">📝 Checklist (${goal.checklist ? goal.checklist.length : 0} items)</span>
        <div class="goal-checklist-items-admin">
          ${(goal.checklist || []).map(item => `
            <div class="goal-checklist-item-admin ${goal.completed ? 'completed' : ''}">
              <span class="goal-checklist-icon-admin">${goal.completed ? '✅' : '☐'}</span>
              <span class="goal-checklist-text-admin ${goal.completed ? 'completed' : ''}">${escapeHtml(item)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="goal-actions-admin">
        <button class="btn-secondary" data-action="toggle" data-id="${goal._id}" style="padding:8px 14px;font-size:13px;">${goal.completed ? 'Mark Not Completed' : 'Mark Completed'}</button>
        <button class="btn-secondary" data-action="edit" data-id="${goal._id}" style="padding:8px 14px;font-size:13px;">Edit</button>
        <button class="btn-remove-checklist" data-action="delete" data-id="${goal._id}" style="padding:8px 14px;font-size:13px;">Delete</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit') openEditGoalModal(id);
      else if (action === 'delete') await deleteGoal(id);
      else if (action === 'toggle') await toggleGoalCompleted(id);
    });
  });
}

async function toggleGoalCompleted(id) {
  const goal = allGoals.find(g => g._id === id);
  if (!goal) return;
  const data = await apiFetch(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ completed: !goal.completed })
  });
  if (data) {
    showNotification('Goal status updated', 'success');
    loadGoals();
  }
}

async function deleteGoal(id) {
  const goal = allGoals.find(g => g._id === id);
  if (!goal) return;
  if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
  const data = await apiFetch(`/goals/${id}`, { method: 'DELETE' });
  if (data) {
    showNotification('Goal deleted', 'success');
    loadGoals();
  }
}

function addChecklistItem() {
  const container = document.getElementById('goalChecklistContainer');
  if (!container) return;
  const index = container.querySelectorAll('.checklist-item').length;
  const div = document.createElement('div');
  div.className = 'checklist-item';
  div.innerHTML = `<input type="text" name="checklist[${index}]" placeholder="Enter checklist item">
    <button type="button" class="btn-remove-checklist" onclick="removeChecklistItem(this)">×</button>`;
  container.appendChild(div);
}

function removeChecklistItem(button) {
  const container = document.getElementById('goalChecklistContainer');
  if (container && container.querySelectorAll('.checklist-item').length > 1) {
    button.closest('.checklist-item').remove();
  } else {
    button.closest('.checklist-item').querySelector('input').value = '';
  }
}

function openAddGoalModal() {
  editingGoalId = null;
  const modal = document.getElementById('goalModal');
  const form = document.getElementById('goalForm');
  form.reset();
  document.querySelector('#goalChecklistContainer').innerHTML =
    `<div class="checklist-item">
      <input type="text" name="checklist[0]" placeholder="Enter checklist item">
      <button type="button" class="btn-remove-checklist" onclick="removeChecklistItem(this)">×</button>
    </div>`;
  document.querySelector('#goalModal h2').textContent = 'Add New Goal';
  if (modal) modal.style.display = 'flex';
}

function openEditGoalModal(id) {
  const goal = allGoals.find(g => g._id === id);
  if (!goal) return;
  editingGoalId = id;
  const form = document.getElementById('goalForm');
  form.elements['title'].value = goal.title || '';
  form.elements['employee'].value = goal.employee?._id || '';
  form.elements['period'].value = goal.period || '';
  form.elements['description'].value = goal.description || '';
  const container = document.getElementById('goalChecklistContainer');
  const items = goal.checklist && goal.checklist.length ? goal.checklist : [''];
  container.innerHTML = items.map((item, i) => `
    <div class="checklist-item">
      <input type="text" name="checklist[${i}]" value="${escapeHtml(item)}" placeholder="Enter checklist item">
      <button type="button" class="btn-remove-checklist" onclick="removeChecklistItem(this)">×</button>
    </div>
  `).join('');
  document.querySelector('#goalModal h2').textContent = 'Edit Goal';
  document.getElementById('goalModal').style.display = 'flex';
}

function closeGoalModal() {
  document.getElementById('goalModal').style.display = 'none';
}

async function handleGoalSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const title = form.elements['title'].value.trim();
  const employee = form.elements['employee'].value;
  const period = form.elements['period'].value;
  const description = form.elements['description'].value.trim();

  if (!title || !employee || !period) {
    showNotification('Title, Employee and Period are required', 'error');
    return;
  }

  const checklist = [];
  form.querySelectorAll('#goalChecklistContainer input').forEach(input => {
    const val = input.value.trim();
    if (val) checklist.push(val);
  });

  const payload = { title, employee, period, description, checklist };
  const url = editingGoalId ? `/goals/${editingGoalId}` : '/goals';
  const method = editingGoalId ? 'PUT' : 'POST';

  const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
  if (data) {
    showNotification(editingGoalId ? 'Goal updated' : 'Goal created', 'success');
    closeGoalModal();
    loadGoals();
  }
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

  initI18n('admin-goals', 'admin-goals');
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

  document.getElementById('addGoalBtn').addEventListener('click', openAddGoalModal);
  const addFromEmpty = document.getElementById('addGoalFromEmpty');
  if (addFromEmpty) addFromEmpty.addEventListener('click', openAddGoalModal);
  document.getElementById('closeGoalModal').addEventListener('click', closeGoalModal);
  document.getElementById('cancelGoal').addEventListener('click', closeGoalModal);
  document.getElementById('goalModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeGoalModal();
  });
  document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
  document.getElementById('searchBtn').addEventListener('click', loadGoals);
  document.getElementById('goalSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadGoals();
  });
  document.getElementById('employeeFilter').addEventListener('change', loadGoals);
  document.getElementById('periodFilter').addEventListener('change', loadGoals);
  document.getElementById('completedFilter').addEventListener('change', loadGoals);

  loadEmployees();
  loadGoals();
}

document.addEventListener('DOMContentLoaded', init);
