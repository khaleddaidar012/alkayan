const API_URL = 'http://localhost:5000/api';

let editingStatusId = null;
let allStatuses = [];

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
  const section = i18n[currentLang]?.customerStatuses || i18n[currentLang]?.communicationTypes || i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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

function readableTextColor(hex) {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex || '');
  if (!m) return '#FFFFFF';
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#111827' : '#FFFFFF';
}

function renderStatuses(statuses) {
  const tbody = document.getElementById('statusesTableBody');
  if (!tbody) return;
  if (!statuses || statuses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="pm-empty">${t('empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = statuses.map(st => {
    const systemBadge = st.is_system
      ? `<span class="pm-country-badge" style="color:var(--gold);border-color:rgba(201,168,76,.25)">${t('systemStatus')}</span>`
      : `<span class="pm-country-badge" style="color:var(--text-muted);border-color:var(--border-color)">${t('customStatus')}</span>`;
    const txt = readableTextColor(st.color);
    return `
      <tr>
        <td><strong>${escapeHtml(st.name)}</strong></td>
        <td>
          <span class="cs-swatch" style="background:${escapeHtml(st.color)};color:${txt};border:1px solid var(--border-color)">${escapeHtml(st.color)}</span>
        </td>
        <td>${st.sort_order}</td>
        <td>${systemBadge}</td>
        <td><span class="pm-country-badge">${st.used_by || 0}</span></td>
        <td>
          <div class="pm-actions">
            <button class="pm-action-btn" data-action="edit" data-id="${st._id}" ${st.is_system ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>✏️ ${t('edit')}</button>
            <button class="pm-action-btn danger" data-action="delete" data-id="${st._id}" ${st.is_system ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>🗑️ ${t('delete')}</button>
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

async function loadStatuses() {
  try {
    const res = await fetch(`${API_URL}/customer-statuses`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'load failed');
    allStatuses = data.statuses || [];
    renderStatuses(allStatuses);
  } catch (error) {
    showToast(t('loadError'), 'error');
  }
}

function openAddModal() {
  editingStatusId = null;
  document.getElementById('statusModalTitle').textContent = t('addStatus');
  document.getElementById('statusFormSubmit').textContent = t('save');
  document.getElementById('statusName').value = '';
  document.getElementById('statusColor').value = '#3B82F6';
  document.getElementById('statusColorHex').value = '#3B82F6';
  document.getElementById('statusSort').value = '0';
  document.getElementById('statusDesc').value = '';
  document.getElementById('statusModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('statusName').focus(), 100);
}

function openEditModal(id) {
  const status = allStatuses.find(m => m._id === id);
  if (!status || status.is_system) return;
  editingStatusId = id;
  document.getElementById('statusModalTitle').textContent = t('editStatus');
  document.getElementById('statusFormSubmit').textContent = t('save');
  document.getElementById('statusName').value = status.name || '';
  document.getElementById('statusColor').value = status.color || '#3B82F6';
  document.getElementById('statusColorHex').value = status.color || '#3B82F6';
  document.getElementById('statusSort').value = status.sort_order ?? 0;
  document.getElementById('statusDesc').value = status.description || '';
  document.getElementById('statusModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('statusName').focus(), 100);
}

function closeStatusModal() {
  document.getElementById('statusModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  editingStatusId = null;
}

async function handleSave(e) {
  e.preventDefault();
  const name = document.getElementById('statusName').value.trim();
  if (name.length < 2) {
    showToast(t('saveError'), 'error');
    return;
  }
  let color = document.getElementById('statusColorHex').value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    color = document.getElementById('statusColor').value || '#3B82F6';
  }
  const payload = {
    name,
    color,
    sort_order: parseInt(document.getElementById('statusSort').value, 10) || 0,
    description: document.getElementById('statusDesc').value.trim()
  };

  const btn = document.getElementById('statusFormSubmit');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const url = editingStatusId ? `${API_URL}/customer-statuses/${editingStatusId}` : `${API_URL}/customer-statuses`;
    const res = await fetch(url, {
      method: editingStatusId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'save failed');
    showToast(editingStatusId ? t('updated') : t('added'), 'success');
    closeStatusModal();
    loadStatuses();
  } catch (error) {
    showToast(error.message || t('saveError'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function handleDelete(id) {
  const status = allStatuses.find(m => m._id === id);
  if (!status || status.is_system) return;
  if (status.used_by > 0) {
    showToast(t('usageWarning'), 'error');
    return;
  }
  if (!confirm(`${t('confirmDelete')} "${status.name}"?`)) return;
  try {
    const res = await fetch(`${API_URL}/customer-statuses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'delete failed');
    showToast(t('deleted'), 'success');
    loadStatuses();
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
  if (langBtn) langBtn.addEventListener('click', () => { switchLang(); renderStatuses(allStatuses); });

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.customerStatuses || i18n[currentLang]?.communicationTypes || i18n[currentLang]?.paymentMethods || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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
      const section = i18n[lang]?.customerStatuses || i18n[lang]?.communicationTypes || i18n[lang]?.paymentMethods || i18n[lang]?.login || i18n[lang];
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

  initI18n('customerStatuses', 'customerStatuses');
  window.updateLangToggle();

  document.getElementById('addStatusBtn').addEventListener('click', openAddModal);
  document.getElementById('statusForm').addEventListener('submit', handleSave);
  document.getElementById('statusModalClose').addEventListener('click', closeStatusModal);
  document.getElementById('statusFormCancel').addEventListener('click', closeStatusModal);
  document.getElementById('statusModal').addEventListener('click', function (e) {
    if (e.target === this) closeStatusModal();
  });

  const colorPicker = document.getElementById('statusColor');
  const colorHex = document.getElementById('statusColorHex');
  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', () => { colorHex.value = colorPicker.value; });
    colorHex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) colorPicker.value = colorHex.value;
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('statusModal').classList.contains('show')) closeStatusModal();
  });

  loadStatuses();
});