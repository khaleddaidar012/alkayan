const API_URL = 'http://localhost:5000/api';

const COUNTRIES_META = [
  { value: 'egypt', flag: '🇪🇬', key: 'egypt' },
  { value: 'saudi_arabia', flag: '🇸🇦', key: 'saudi_arabia' },
  { value: 'oman', flag: '🇴🇲', key: 'oman' },
  { value: 'libya', flag: '🇱🇾', key: 'libya' },
  { value: 'other', flag: '🌍', key: 'other' },
  { value: 'global', flag: '🌐', key: 'global' }
];

let editingMethodId = null;
let allMethods = [];

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
  const section = i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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

function countryMeta(value) {
  return COUNTRIES_META.find(c => c.value === value) || { flag: '🌐', key: 'global' };
}

function renderMethods(methods) {
  const tbody = document.getElementById('methodsTableBody');
  if (!tbody) return;
  if (!methods || methods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="pm-empty">${t('empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = methods.map(m => {
    const meta = countryMeta(m.country);
    const activePill = `<span class="pm-toggle-pill ${m.is_active ? 'active' : ''}"></span>`;
    return `
      <tr>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td><span class="pm-country-badge">${meta.flag} ${t(meta.key)}</span></td>
        <td>${m.sort_order}</td>
        <td>${activePill}</td>
        <td>
          <div class="pm-actions">
            <button class="pm-action-btn" data-action="edit" data-id="${m._id}">✏️ ${t('edit')}</button>
            <button class="pm-action-btn danger" data-action="delete" data-id="${m._id}">🗑️ ${t('delete')}</button>
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

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadMethods() {
  try {
    const res = await fetch(`${API_URL}/payment-methods?includeInactive=true`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'load failed');
    allMethods = data.methods || [];
    renderMethods(allMethods);
  } catch (error) {
    showToast(t('loadError'), 'error');
  }
}

function openAddModal() {
  editingMethodId = null;
  document.getElementById('methodModalTitle').textContent = t('addMethod');
  document.getElementById('methodFormSubmit').textContent = t('save');
  document.getElementById('methodName').value = '';
  document.getElementById('methodCountry').value = 'global';
  document.getElementById('methodSort').value = '0';
  document.getElementById('methodActive').checked = true;
  document.getElementById('methodModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('methodName').focus(), 100);
}

function openEditModal(id) {
  const method = allMethods.find(m => m._id === id);
  if (!method) return;
  editingMethodId = id;
  document.getElementById('methodModalTitle').textContent = t('editMethod');
  document.getElementById('methodFormSubmit').textContent = t('save');
  document.getElementById('methodName').value = method.name || '';
  document.getElementById('methodCountry').value = method.country || 'global';
  document.getElementById('methodSort').value = method.sort_order ?? 0;
  document.getElementById('methodActive').checked = !!method.is_active;
  document.getElementById('methodModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('methodName').focus(), 100);
}

function closeMethodModal() {
  document.getElementById('methodModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  editingMethodId = null;
}

async function handleSave(e) {
  e.preventDefault();
  const name = document.getElementById('methodName').value.trim();
  if (name.length < 2) {
    showToast(t('saveError'), 'error');
    return;
  }
  const payload = {
    name,
    country: document.getElementById('methodCountry').value,
    sort_order: parseInt(document.getElementById('methodSort').value, 10) || 0,
    is_active: document.getElementById('methodActive').checked
  };

  const btn = document.getElementById('methodFormSubmit');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const url = editingMethodId ? `${API_URL}/payment-methods/${editingMethodId}` : `${API_URL}/payment-methods`;
    const res = await fetch(url, {
      method: editingMethodId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'save failed');
    showToast(editingMethodId ? t('updated') : t('added'), 'success');
    closeMethodModal();
    loadMethods();
  } catch (error) {
    showToast(t('saveError'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function handleDelete(id) {
  const method = allMethods.find(m => m._id === id);
  const label = method?.is_active ? t('deactivate') : t('delete');
  if (!confirm(`${label} "${method?.name || ''}"?`)) return;
  try {
    const res = await fetch(`${API_URL}/payment-methods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'delete failed');
    showToast(data.message?.includes('deactivat') ? t('deactivated') : t('deleted'), 'success');
    loadMethods();
  } catch (error) {
    showToast(t('saveError'), 'error');
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
  if (langBtn) langBtn.addEventListener('click', () => { switchLang(); renderMethods(allMethods); });

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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
      const section = i18n[lang]?.paymentMethods || i18n[lang]?.login || i18n[lang];
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

  initI18n('paymentMethods', 'paymentMethods');
  window.updateLangToggle();

  document.getElementById('addMethodBtn').addEventListener('click', openAddModal);
  document.getElementById('methodForm').addEventListener('submit', handleSave);
  document.getElementById('methodModalClose').addEventListener('click', closeMethodModal);
  document.getElementById('methodFormCancel').addEventListener('click', closeMethodModal);
  document.getElementById('methodModal').addEventListener('click', function (e) {
    if (e.target === this) closeMethodModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('methodModal').classList.contains('show')) closeMethodModal();
  });

  loadMethods();
});
