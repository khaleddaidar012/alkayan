const API_URL = 'http://localhost:5000/api';

let allTasks = [];
let allUsers = [];
let allClients = [];
let allCampaigns = [];
let allPrograms = [];

function getUser() {
  try { return JSON.parse(localStorage.getItem('alkayan_user')); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function can(module, action) {
  const user = getUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions && user.permissions[module] && user.permissions[module][action] === true;
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

function showToast(message, type) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'success');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-remove');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(getUser()?.lang === 'ar' ? 'ar-SA' : 'en-US', options);
}

const STATUS_TEXT = {
  'pending': 'Pending',
  'in_progress': 'In Progress',
  'completed': 'Completed'
};

function getStatusText(status) {
  return STATUS_TEXT[status] || status || 'Unknown';
}

function statusClass(status) {
  return 'status-' + (status || 'pending');
}

// ---- API Calls ----
async function apiFetch(url, options) {
  const token = getToken();
  if (!token) { redirectToLogin(); return null; }
  try {
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options?.headers || {})
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
      showToast(data.message || 'Request failed', 'error');
      return null;
    }
    return data;
  } catch (err) {
    showToast('Server connection failed', 'error');
    return null;
  }
}

// ---- Tasks ----
async function loadTasks() {
  const grid = document.getElementById('tasksGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '<div class="loading-message">Loading tasks...</div>';
  emptyState.style.display = 'none';

  const params = new URLSearchParams();
  const employeeFilter = document.getElementById('employeeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const dateFilter = document.getElementById('dateFilter');
  const taskSearch = document.getElementById('taskSearch');

  if (employeeFilter && employeeFilter.value) params.set('assignedTo', employeeFilter.value);
  if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
  if (dateFilter && dateFilter.value) params.set('deadline', dateFilter.value);
  if (taskSearch && taskSearch.value.trim()) params.set('search', taskSearch.value.trim());

  const qs = params.toString();
  const data = await apiFetch(`/tasks${qs ? '?' + qs : ''}`);
  if (!data) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error</h3><p>Failed to load tasks. Please try again later.</p></div>';
    return;
  }

  allTasks = data.tasks || [];
  renderTasks();
}

function renderTasks() {
  const grid = document.getElementById('tasksGrid');
  const emptyState = document.getElementById('emptyState');

  if (allTasks.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = allTasks.map(task => getTaskCardHTML(task)).join('');
}

function getTaskCardHTML(task) {
  const canEdit = can('tasks', 'edit') || can('tasks', 'update');
  const canDelete = can('tasks', 'delete');
  const employeeName = task.assignedTo?.name || 'Unassigned';
  const clientCount = task.relatedClients ? task.relatedClients.length : 0;
  const campaignName = task.relatedCampaign?.name;
  const programName = task.relatedProgram?.name;
  const hasProof = task.proofType || task.proofContent;

  let relatedInfo = '';
  if (clientCount > 0) relatedInfo += `<div class="task-employee"><span>👥</span><span>${clientCount} client${clientCount !== 1 ? 's' : ''}</span></div>`;
  if (campaignName) relatedInfo += `<div class="task-employee"><span>📣</span><span>${escapeHtml(campaignName)}</span></div>`;
  if (programName) relatedInfo += `<div class="task-employee"><span>📚</span><span>${escapeHtml(programName)}</span></div>`;

  let statusActions = '';
  if (task.status === 'pending') {
    statusActions = `<button class="btn-primary task-status-btn" data-task-id="${task._id}" data-status="in_progress">Start</button>`;
  } else if (task.status === 'in_progress') {
    statusActions = `<button class="btn-primary task-status-btn" data-task-id="${task._id}" data-status="completed">Complete</button>`;
  } else {
    statusActions = `<button class="btn-secondary task-status-btn" data-task-id="${task._id}" data-status="in_progress">Reopen</button>`;
  }

  return `
    <div class="task-card" data-task-id="${task._id}">
      <div class="task-card-header">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <span class="task-status-badge ${statusClass(task.status)}">${getStatusText(task.status)}</span>
      </div>
      <div class="task-meta">
        <div class="task-employee"><span>👤</span><span>${escapeHtml(employeeName)}</span></div>
        <div class="task-deadline"><span>📅</span><span>Deadline: ${formatDate(task.deadline)}</span></div>
        ${relatedInfo}
      </div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      ${hasProof ? `<div class="task-proof"><span>✅</span><span>Proof submitted</span></div>` : ''}
      <div class="form-actions">
        ${statusActions}
        ${canEdit ? `<button class="btn-secondary task-edit-btn" data-task-id="${task._id}">Edit</button>` : ''}
        ${canDelete ? `<button class="btn-secondary task-delete-btn" data-task-id="${task._id}">Delete</button>` : ''}
      </div>
    </div>
  `;
}

// ---- Dropdowns ----
async function loadFilterData() {
  const [usersData, clientsData, campaignsData, programsData] = await Promise.all([
    apiFetch('/users'),
    apiFetch('/customers'),
    apiFetch('/campaigns'),
    apiFetch('/programs')
  ]);

  allUsers = usersData?.users || [];
  allClients = clientsData?.customers || [];
  allCampaigns = campaignsData?.campaigns || [];
  allPrograms = programsData?.programs || [];

  const employeeFilter = document.getElementById('employeeFilter');
  if (employeeFilter && allUsers.length > 0) {
    employeeFilter.innerHTML = '<option value="">All Employees</option>' +
      allUsers.map(u => `<option value="${u._id}">${escapeHtml(u.name)}</option>`).join('');
  }
}

function populateAddModalSelects() {
  const assignedSelect = document.querySelector('#addTaskForm select[name="assignedTo"]');
  if (assignedSelect) {
    assignedSelect.innerHTML = '<option value="">Select Employee</option>' +
      allUsers.map(u => `<option value="${u._id}">${escapeHtml(u.name)}</option>`).join('');
  }

  const campaignSelect = document.querySelector('#addTaskForm select[name="relatedCampaign"]');
  if (campaignSelect) {
    campaignSelect.innerHTML = '<option value="">No Campaign</option>' +
      allCampaigns.map(c => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
  }

  const programSelect = document.querySelector('#addTaskForm select[name="relatedProgram"]');
  if (programSelect) {
    programSelect.innerHTML = '<option value="">No Program</option>' +
      allPrograms.map(p => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');
  }

  const clientsContainer = document.getElementById('clientsContainer');
  if (clientsContainer) {
    if (allClients.length === 0) {
      clientsContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">No clients available</p>';
    } else {
      clientsContainer.innerHTML = allClients.map(c => `
        <label class="client-checkbox">
          <input type="checkbox" value="${c._id}">
          <span>${escapeHtml(c.name)}${c.phone ? ` — ${escapeHtml(c.phone)}` : ''}</span>
        </label>
      `).join('');
    }
  }
}

// ---- Modals ----
function openModal(selector) {
  const modal = document.querySelector(selector);
  if (modal) modal.style.display = 'flex';
}

function closeModal(selector) {
  const modal = document.querySelector(selector);
  if (modal) modal.style.display = 'none';
}

function openAddTaskModal() {
  populateAddModalSelects();
  document.getElementById('addTaskForm').reset();
  openModal('#addTaskModal');
}

function openEditTaskModal(taskId) {
  const task = allTasks.find(t => t._id === taskId);
  if (!task) return;

  const form = document.getElementById('editTaskForm');
  form.reset();
  form.querySelector('input[name="id"]').value = task._id;
  form.querySelector('input[name="title"]').value = task.title;
  form.querySelector('select[name="status"]').value = task.status;

  openModal('#editTaskModal');
}

// ---- Actions ----
async function createTask(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const relatedClients = Array.from(form.querySelectorAll('#clientsContainer input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  const relatedCampaign = formData.get('relatedCampaign') || null;
  const relatedProgram = formData.get('relatedProgram') || null;

  if (!formData.get('title') || !formData.get('assignedTo') || !formData.get('deadline')) {
    showToast('Task title, employee and deadline are required', 'error');
    return;
  }

  if (relatedClients.length === 0 && !relatedCampaign && !relatedProgram) {
    showToast('At least one client, campaign, or program must be selected', 'error');
    return;
  }

  const data = await apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: formData.get('title'),
      description: formData.get('description') || '',
      assignedTo: formData.get('assignedTo'),
      deadline: formData.get('deadline'),
      type: formData.get('type') || 'general',
      priority: formData.get('priority') || 'medium',
      relatedClients,
      relatedCampaign,
      relatedProgram
    })
  });

  if (data) {
    closeModal('#addTaskModal');
    form.reset();
    showToast('Task created successfully!', 'success');
    loadTasks();
  }
}

async function updateTask(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const taskId = formData.get('id');
  const title = formData.get('title');
  const status = formData.get('status');

  if (!taskId || !title) {
    showToast('Task title is required', 'error');
    return;
  }

  const data = await apiFetch(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, status })
  });

  if (data) {
    closeModal('#editTaskModal');
    showToast('Task updated successfully!', 'success');
    loadTasks();
  }
}

async function changeTaskStatus(taskId, status) {
  const data = await apiFetch(`/tasks/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });

  if (data) {
    showToast('Task status updated!', 'success');
    loadTasks();
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  const data = await apiFetch(`/tasks/${taskId}`, {
    method: 'DELETE'
  });

  if (data) {
    showToast('Task deleted successfully!', 'success');
    loadTasks();
  }
}

// ---- Event wiring ----
function setupGridEvents() {
  const grid = document.getElementById('tasksGrid');
  if (!grid) return;

  grid.addEventListener('click', function (e) {
    const statusBtn = e.target.closest('.task-status-btn');
    const editBtn = e.target.closest('.task-edit-btn');
    const deleteBtn = e.target.closest('.task-delete-btn');

    if (statusBtn) {
      changeTaskStatus(statusBtn.dataset.taskId, statusBtn.dataset.status);
    } else if (editBtn) {
      openEditTaskModal(editBtn.dataset.taskId);
    } else if (deleteBtn) {
      deleteTask(deleteBtn.dataset.taskId);
    }
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
  const user = getUser();

  if (!token || !user) {
    redirectToLogin();
    return;
  }

  initI18n('tasks', 'tasks');
  initTheme();

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;

  initSidebar();
  setupGridEvents();

  const langBtn = document.getElementById('langToggle2');
  if (langBtn) langBtn.addEventListener('click', switchLang);
  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const s = i18n[currentLang]?.tasks || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${s.langSwitch || ''}`;
    }
  };

  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const s = i18n[currentLang]?.tasks || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    if (theme === 'dark') {
      btn.innerHTML = `<span class="icon">☀️</span> ${s?.themeLight || 'Light'}`;
    } else {
      btn.innerHTML = `<span class="icon">🌙</span> ${s?.themeDark || 'Dark'}`;
    }
  };
  updateLangToggle();
  updateThemeToggle();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('alkayan_token');
      sessionStorage.removeItem('alkayan_token');
      localStorage.removeItem('alkayan_user');
      redirectToLogin();
    });
  }

  // Toolbar
  document.getElementById('addTaskBtn').addEventListener('click', openAddTaskModal);
  document.getElementById('addTaskFromEmpty').addEventListener('click', openAddTaskModal);
  document.getElementById('searchBtn').addEventListener('click', loadTasks);
  document.getElementById('taskSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadTasks();
  });
  document.getElementById('employeeFilter').addEventListener('change', loadTasks);
  document.getElementById('statusFilter').addEventListener('change', loadTasks);
  document.getElementById('dateFilter').addEventListener('change', loadTasks);

  // Add modal
  document.getElementById('closeModal').addEventListener('click', () => closeModal('#addTaskModal'));
  document.getElementById('cancelAddTask').addEventListener('click', () => closeModal('#addTaskModal'));
  document.getElementById('addTaskModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('#addTaskModal');
  });
  document.getElementById('addTaskForm').addEventListener('submit', createTask);

  // Edit modal
  document.getElementById('closeEditModal').addEventListener('click', () => closeModal('#editTaskModal'));
  document.getElementById('cancelEditTask').addEventListener('click', () => closeModal('#editTaskModal'));
  document.getElementById('editTaskModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('#editTaskModal');
  });
  document.getElementById('editTaskForm').addEventListener('submit', updateTask);

  // Disable create buttons if no permission
  if (!can('tasks', 'create')) {
    document.getElementById('addTaskBtn').disabled = true;
    document.getElementById('addTaskFromEmpty').disabled = true;
  }

  loadFilterData();
  loadTasks();
}

document.addEventListener('DOMContentLoaded', init);
