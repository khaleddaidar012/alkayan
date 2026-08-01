const API_URL = 'http://localhost:5000/api';

const PERMISSION_MODULES = ['customers', 'programs', 'tasks', 'reports', 'users'];
const PERMISSION_ACTIONS = {
  customers: ['view', 'add', 'edit', 'delete'],
  programs: ['view', 'add', 'edit', 'delete'],
  tasks: ['view', 'create', 'updateStatus'],
  reports: ['view'],
  users: ['view', 'create', 'edit', 'delete']
};

let allUsers = [];
let editingUserId = null;
let permissionsUserId = null;

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

function t(key) {
  const section = i18n[currentLang]?.users || i18n[currentLang]?.login || i18n[currentLang];
  return section[key] || key;
}

function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type || 'success'}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-remove');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', options);
}

function getDefaultPermissions(role) {
  const defaults = {
    admin: {
      customers: { view: true, add: true, edit: true, delete: true },
      programs: { view: true, add: true, edit: true, delete: true },
      tasks: { view: true, create: true, updateStatus: true },
      reports: { view: true },
      users: { view: true, create: true, edit: true, delete: true }
    },
    manager: {
      customers: { view: true, add: false, edit: false, delete: false },
      programs: { view: true, add: false, edit: false, delete: false },
      tasks: { view: true, create: true, updateStatus: true },
      reports: { view: false },
      users: { view: false, create: false, edit: false, delete: false }
    },
    employee: {
      customers: { view: false, add: false, edit: false, delete: false },
      programs: { view: false, add: false, edit: false, delete: false },
      tasks: { view: true, create: false, updateStatus: true },
      reports: { view: false },
      users: { view: false, create: false, edit: false, delete: false }
    }
  };
  return JSON.parse(JSON.stringify(defaults[role] || defaults.employee));
}

// ---- Permissions Builder ----
function buildPermissionToggles(containerId, permissions, readOnly) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  PERMISSION_MODULES.forEach(mod => {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'permission-module';

    const header = document.createElement('div');
    header.className = 'permission-module-header';
    header.innerHTML = `<span>${t(mod)}</span>`;
    moduleDiv.appendChild(header);

    const actions = document.createElement('div');
    actions.className = 'permission-actions';

    PERMISSION_ACTIONS[mod].forEach(action => {
      const label = document.createElement('label');
      label.className = 'permission-toggle';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.module = mod;
      checkbox.dataset.action = action;
      if (permissions && permissions[mod] && permissions[mod][action]) {
        checkbox.checked = true;
      }
      if (readOnly) checkbox.disabled = true;

      const track = document.createElement('span');
      track.className = 'toggle-track';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'toggle-label';
      labelSpan.textContent = t(action);

      label.appendChild(checkbox);
      label.appendChild(track);
      label.appendChild(labelSpan);
      actions.appendChild(label);
    });

    moduleDiv.appendChild(actions);
    container.appendChild(moduleDiv);
  });
}

function collectPermissions(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return {};
  const result = {};

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const mod = cb.dataset.module;
    const action = cb.dataset.action;
    if (!result[mod]) result[mod] = {};
    result[mod][action] = cb.checked;
  });

  return result;
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

async function loadUsers() {
  const data = await apiFetch('/users');
  if (!data) return;
  allUsers = data.users || [];
  renderUsers();
  updateStats();
}

// ---- Render ----
function renderUsers(filterText) {
  const tbody = document.getElementById('usersTableBody');
  const empty = document.getElementById('usersEmpty');
  if (!tbody) return;

  let users = allUsers;
  if (filterText) {
    const q = filterText.toLowerCase();
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }

  if (users.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.add('show');
    return;
  }
  if (empty) empty.classList.remove('show');

  tbody.innerHTML = users.map(u => {
    const initial = u.name.charAt(0).toUpperCase();
    const roleClass = u.role;
    const statusClass = u.isActive ? 'active' : 'inactive';
    const statusKey = u.isActive ? 'active' : 'inactive';

    return `
      <tr>
        <td>
          <div class="user-name-cell">
            <div class="user-avatar-sm">${initial}</div>
            <div>
              <div>${u.name}</div>
            </div>
          </div>
        </td>
        <td><span class="user-email">${u.email}</span></td>
        <td><span class="role-badge ${roleClass}">${t(roleClass)}</span></td>
        <td><span class="status-badge ${statusClass}">${t(statusKey)}</span></td>
        <td><span class="created-date">${formatDate(u.createdAt)}</span></td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" onclick="openEditUser('${u._id}')" title="${t('edit')}">✏️</button>
            <button class="action-btn lock" onclick="openPermissionsModal('${u._id}')" title="${t('managePermissions')}">🔐</button>
            <button class="action-btn" onclick="toggleUserStatus('${u._id}')" title="${u.isActive ? t('deactivate') : t('activate')}">
              ${u.isActive ? '⛔' : '✅'}
            </button>
            <button class="action-btn delete" onclick="openDeleteModal('${u._id}')" title="${t('delete')}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateStats() {
  const total = allUsers.length;
  const admins = allUsers.filter(u => u.role === 'admin').length;
  const managers = allUsers.filter(u => u.role === 'manager').length;
  const employees = allUsers.filter(u => u.role === 'employee').length;

  document.getElementById('totalUsersCount').textContent = total;
  document.getElementById('adminUsersCount').textContent = admins;
  document.getElementById('managerUsersCount').textContent = managers;
  document.getElementById('employeeUsersCount').textContent = employees;
}

// ---- Add / Edit User ----
function openAddUser() {
  editingUserId = null;
  document.getElementById('modalTitle').textContent = t('addUser');
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('formPassword').required = true;
  document.getElementById('userForm').reset();
  document.getElementById('formPassword').value = '';
  const role = document.getElementById('formRole').value;
  const perms = getDefaultPermissions(role);
  buildPermissionToggles('permissionsGrid', perms);
  document.getElementById('userModal').classList.add('show');
}

function openEditUser(id) {
  const user = allUsers.find(u => u._id === id);
  if (!user) return;
  editingUserId = id;
  document.getElementById('modalTitle').textContent = t('editUser');
  document.getElementById('passwordGroup').style.display = 'none';
  document.getElementById('formPassword').required = false;
  document.getElementById('formName').value = user.name;
  document.getElementById('formEmail').value = user.email;
  document.getElementById('formRole').value = user.role;
  const perms = user.permissions || getDefaultPermissions(user.role);
  buildPermissionToggles('permissionsGrid', perms);
  document.getElementById('userModal').classList.add('show');
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('show');
  editingUserId = null;
}

async function handleUserSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('formName').value.trim();
  const email = document.getElementById('formEmail').value.trim();
  const password = document.getElementById('formPassword').value;
  const role = document.getElementById('formRole').value;
  const permissions = collectPermissions('permissionsGrid');

  if (!name || !email) return;

  if (editingUserId) {
    const data = await apiFetch(`/users/${editingUserId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email, role })
    });
    if (data) {
      const permData = await apiFetch(`/users/${editingUserId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      });
      if (permData) {
        showToast(t('userUpdated'));
        closeUserModal();
        loadUsers();
      }
    }
  } else {
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    const data = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, permissions })
    });
    if (data) {
      showToast(t('userCreated'));
      closeUserModal();
      loadUsers();
    }
  }
}

// ---- Permissions Modal ----
function openPermissionsModal(id) {
  const user = allUsers.find(u => u._id === id);
  if (!user) return;
  permissionsUserId = id;
  const info = document.getElementById('permsUserInfo');
  info.innerHTML = `
    <div class="perms-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
    <div class="perms-user-detail">
      <div class="perms-user-name">${user.name}</div>
      <div class="perms-user-email">${user.email} — <span class="role-badge ${user.role}" style="font-size:11px;padding:2px 8px">${t(user.role)}</span></div>
    </div>
  `;
  const perms = user.permissions || getDefaultPermissions(user.role);
  buildPermissionToggles('permsGrid', perms);
  document.getElementById('permissionsModal').classList.add('show');
}

function closePermissionsModal() {
  document.getElementById('permissionsModal').classList.remove('show');
  permissionsUserId = null;
}

async function savePermissions() {
  if (!permissionsUserId) return;
  const permissions = collectPermissions('permsGrid');
  const data = await apiFetch(`/users/${permissionsUserId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions })
  });
  if (data) {
    showToast(t('permissionsUpdated'));
    closePermissionsModal();
    loadUsers();
  }
}

// ---- Delete ----
let deleteUserId = null;

function openDeleteModal(id) {
  const user = allUsers.find(u => u._id === id);
  if (!user) return;
  deleteUserId = id;
  document.getElementById('deleteUserName').textContent = user.name;
  document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  deleteUserId = null;
}

async function confirmDelete() {
  if (!deleteUserId) return;
  const data = await apiFetch(`/users/${deleteUserId}`, { method: 'DELETE' });
  if (data) {
    showToast(t('userDeleted'));
    closeDeleteModal();
    loadUsers();
  }
}

// ---- Toggle Status ----
async function toggleUserStatus(id) {
  const data = await apiFetch(`/users/${id}/status`, { method: 'PUT' });
  if (data) {
    loadUsers();
  }
}

// ---- Init ----
function initUsers() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    redirectToLogin();
    return;
  }

  initI18n('users', 'users');
  initTheme();

  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;

  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', function () {
      const page = this.dataset.nav;
      if (page) window.location.href = `${page}.html`;
    });
  });

  // Sidebar toggle
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

  // Lang toggle
  const langBtn = document.getElementById('langToggle2');
  if (langBtn) {
    langBtn.addEventListener('click', switchLang);
  }

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.users || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${section.langSwitch || ''}`;
    }
  };

  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const section = i18n[currentLang]?.users || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    if (theme === 'dark') {
      btn.innerHTML = `<span class="icon">☀️</span> ${section?.themeLight || 'Light'}`;
    } else {
      btn.innerHTML = `<span class="icon">🌙</span> ${section?.themeDark || 'Dark'}`;
    }
  };

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('alkayan_token');
      sessionStorage.removeItem('alkayan_token');
      localStorage.removeItem('alkayan_user');
      redirectToLogin();
    });
  }

  updateLangToggle();
  updateThemeToggle();

  // Add user button
  document.getElementById('addUserBtn').addEventListener('click', openAddUser);

  // Form submit
  document.getElementById('userForm').addEventListener('submit', handleUserSubmit);

  // Modal close buttons
  document.getElementById('modalClose').addEventListener('click', closeUserModal);
  document.getElementById('formCancel').addEventListener('click', closeUserModal);

  // Permissions modal
  document.getElementById('permsModalClose').addEventListener('click', closePermissionsModal);
  document.getElementById('permsCancel').addEventListener('click', closePermissionsModal);
  document.getElementById('permsSave').addEventListener('click', savePermissions);

  // Delete modal
  document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancel').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirm').addEventListener('click', confirmDelete);

  // Role change updates permissions defaults
  document.getElementById('formRole').addEventListener('change', function () {
    if (!editingUserId) {
      const perms = getDefaultPermissions(this.value);
      buildPermissionToggles('permissionsGrid', perms);
    }
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', function () {
    renderUsers(this.value);
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  });

  loadUsers();
}

document.addEventListener('DOMContentLoaded', initUsers);
