const API_URL = 'http://localhost:5000/api';

let editingTypeId = null;
let allTypes = [];

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
  const section = i18n[currentLang]?.communicationTypes || i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderTypes(types) {
  const tbody = document.getElementById('typesTableBody');
  if (!tbody) return;
  if (!types || types.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="pm-empty">${t('empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = types.map(ty => {
    const systemBadge = ty.is_system ? `<span class="pm-country-badge" style="color:var(--gold);border-color:rgba(201,168,76,.25)">${t('systemType')}</span>` : `<span class="pm-country-badge" style="color:var(--text-muted);border-color:var(--border-color)">${t('customType')}</span>`;
    return `
      <tr>
        <td><strong>${escapeHtml(ty.name)}</strong></td>
        <td><span class="ct-icon-cell">${escapeHtml(ty.icon) || '💬'}</span></td>
        <td>${systemBadge}</td>
        <td>${ty.sort_order}</td>
        <td>
          <div class="pm-actions">
            <button class="pm-action-btn" data-action="edit" data-id="${ty._id}" ${ty.is_system ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>✏️ ${t('edit')}</button>
            <button class="pm-action-btn danger" data-action="delete" data-id="${ty._id}" ${ty.is_system ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>🗑️ ${t('delete')}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

async function loadTypes() {
  try {
    const res = await fetch(`${API_URL}/communication-types`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'load failed');
    allTypes = data.types || [];
    renderTypes(allTypes);
  } catch (error) {
    showToast(t('loadError'), 'error');
  }
}

function openAddModal() {
  editingTypeId = null;
  document.getElementById('typeModalTitle').textContent = t('addType');
  document.getElementById('typeFormSubmit').textContent = t('save');
  document.getElementById('typeName').value = '';
  document.getElementById('typeIcon').value = '💬';
  document.getElementById('typeSort').value = '0';
  document.getElementById('typeModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('typeName').focus(), 100);
}

function openEditModal(id) {
  const type = allTypes.find(m => m._id === id);
  if (!type || type.is_system) return;
  editingTypeId = id;
  document.getElementById('typeModalTitle').textContent = t('editType');
  document.getElementById('typeFormSubmit').textContent = t('save');
  document.getElementById('typeName').value = type.name || '';
  document.getElementById('typeIcon').value = type.icon || '💬';
  document.getElementById('typeSort').value = type.sort_order ?? 0;
  document.getElementById('typeModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('typeName').focus(), 100);
}

function closeTypeModal() {
  document.getElementById('typeModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  editingTypeId = null;
}

async function handleSave(e) {
  e.preventDefault();
  const name = document.getElementById('typeName').value.trim();
  if (name.length < 2) {
    showToast(t('saveError'), 'error');
    return;
  }
  const payload = {
    name,
    icon: document.getElementById('typeIcon').value.trim() || '💬',
    sort_order: parseInt(document.getElementById('typeSort').value, 10) || 0
  };

  const btn = document.getElementById('typeFormSubmit');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const url = editingTypeId ? `${API_URL}/communication-types/${editingTypeId}` : `${API_URL}/communication-types`;
    const res = await fetch(url, {
      method: editingTypeId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'save failed');
    showToast(editingTypeId ? t('updated') : t('added'), 'success');
    closeTypeModal();
    loadTypes();
  } catch (error) {
    showToast(t('saveError'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function handleDelete(id) {
  const type = allTypes.find(m => m._id === id);
  if (!type || type.is_system) return;
  if (!confirm(`${t('delete')} "${type.name}"?`)) return;
  try {
    const res = await fetch(`${API_URL}/communication-types/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'delete failed');
    showToast(t('deleted'), 'success');
    loadTypes();
  } catch (error) {
    showToast(error.message || t('saveError'), 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return redirectToLogin();
  if (user.role !== 'admin') {
    showToast(t('loadError'), 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;

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

  const langBtn = document.getElementById('langToggle2');
  if (langBtn) langBtn.addEventListener('click', () => { switchLang(); renderTypes(allTypes); });

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.communicationTypes || i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${section.langSwitch || ''}`;
    }
  };

  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (btn) {
      const theme = getTheme();
      const lang = currentLang || 'ar';
      const section = i18n[lang]?.communicationTypes || i18n[lang]?.paymentMethods || i18n[lang]?.login || i18n[lang];
      if (theme === 'dark') {
        btn.innerHTML = `<span class="icon">☀️</span> ${section?.themeLight || 'Light'}`;
      } else {
        btn.innerHTML = `<span class="icon">🌙</span> ${section?.themeDark || 'Dark'}`;
      }
    }
  };
  window.updateThemeToggle();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('alkayan_token');
      localStorage.removeItem('alkayan_user');
      window.location.href = 'login.html';
    });
  }

  initI18n('communicationTypes', 'communicationTypes');
  window.updateLangToggle();

  document.getElementById('addTypeBtn').addEventListener('click', openAddModal);
  document.getElementById('typeForm').addEventListener('submit', handleSave);
  document.getElementById('typeModalClose').addEventListener('click', closeTypeModal);
  document.getElementById('typeFormCancel').addEventListener('click', closeTypeModal);
  document.getElementById('typeModal').addEventListener('click', function (e) {
    if (e.target === this) closeTypeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('typeModal').classList.contains('show')) closeTypeModal();
  });

  loadTypes();
});