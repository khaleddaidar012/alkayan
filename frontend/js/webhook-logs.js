const API_URL = 'http://localhost:5000/api';

let allLogs = [];
let logsPage = 1;
let totalLogs = 0;
let selectedLogId = null;

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
  const section = i18n[currentLang]?.webhookLogs || i18n[currentLang]?.customerStatuses || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadge(status) {
  const label = status === 'success' ? t('success') : t('error');
  const cls = status === 'success' ? 'pm-badge-success' : 'pm-badge-error';
  return `<span class="pm-badge ${cls}">${label}</span>`;
}

function actionBadge(action) {
  const map = {
    created: { cls: 'pm-badge-created', key: 'created' },
    updated: { cls: 'pm-badge-updated', key: 'updated' },
    no_change: { cls: 'pm-badge-nochange', key: 'noChange' },
    failed: { cls: 'pm-badge-failed', key: 'failed' }
  };
  const item = map[action] || map.failed;
  return `<span class="pm-badge ${item.cls}">${t(item.key)}</span>`;
}

function renderLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  if (!allLogs || allLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="pm-empty">${t('empty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = allLogs.map(log => `
    <tr class="pm-log-row" data-id="${log._id}">
      <td class="pm-log-date">${escapeHtml(formatDate(log.created_at))}</td>
      <td>${statusBadge(log.status)}</td>
      <td>${actionBadge(log.action)}</td>
      <td>
        ${log.customer
          ? `<a class="pm-customer-link" href="customers.html?focus=${log.customer._id}" data-customer-id="${log.customer._id}">${escapeHtml(log.customer.name || '—')}</a>`
          : '—'}
      </td>
      <td>${log.processing_time_ms != null ? `${log.processing_time_ms} ${t('ms')}` : '—'}</td>
      <td>
        <button class="pm-action-btn" data-action="view" data-id="${log._id}">👁️</button>
        ${log.status === 'error' ? `<button class="pm-action-btn" data-action="reprocess" data-id="${log._id}">🔄</button>` : ''}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.pm-log-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action === 'reprocess') return;
      if (e.target.closest('.pm-customer-link')) return;
      openLogModal(row.dataset.id);
    });
  });
  tbody.querySelectorAll('[data-action="reprocess"]').forEach(btn => {
    btn.addEventListener('click', () => reprocessLog(btn.dataset.id));
  });

  document.getElementById('pageInfo').textContent = `${logsPage} / ${Math.max(1, Math.ceil(totalLogs / 20))}`;
  document.getElementById('prevPageBtn').disabled = logsPage <= 1;
  document.getElementById('nextPageBtn').disabled = logsPage * 20 >= totalLogs;
}

async function loadLogs() {
  const params = new URLSearchParams({ page: logsPage, limit: '20' });
  const status = document.getElementById('filterStatus').value;
  const action = document.getElementById('filterAction').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;
  if (status) params.set('status', status);
  if (action) params.set('action', action);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  try {
    const res = await fetch(`${API_URL}/webhook/logs?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'load failed');
    allLogs = data.logs || [];
    totalLogs = data.total || 0;
    renderLogs();
  } catch (error) {
    showToast(t('loadError'), 'error');
  }
}

function openLogModal(id) {
  const log = allLogs.find(l => l._id === id);
  if (!log) return;
  selectedLogId = id;
  document.getElementById('logPayload').textContent = JSON.stringify(log.payload || {}, null, 2);
  const errSection = document.getElementById('logErrorSection');
  if (log.error_message) {
    errSection.style.display = '';
    document.getElementById('logError').textContent = log.error_message;
  } else {
    errSection.style.display = 'none';
  }
  const custSection = document.getElementById('logCustomerSection');
  if (log.customer) {
    custSection.style.display = '';
    document.getElementById('logCustomer').textContent = `${log.customer.name || ''} — ${log.customer.phone || ''}`;
  } else {
    custSection.style.display = 'none';
  }
  const reprocessBtn = document.getElementById('reprocessBtn');
  reprocessBtn.style.display = log.status === 'error' ? '' : 'none';
  document.getElementById('logModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeLogModal() {
  document.getElementById('logModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  selectedLogId = null;
}

async function reprocessLog(id) {
  try {
    const res = await fetch(`${API_URL}/webhook/logs/${id}/reprocess`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'reprocess failed');
    showToast(t('reprocessed'), 'success');
    closeLogModal();
    loadLogs();
  } catch (error) {
    showToast(error.message || t('reprocessFailed'), 'error');
    loadLogs();
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
  if (langBtn) langBtn.addEventListener('click', () => { switchLang(); renderLogs(); });

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.webhookLogs || i18n[currentLang]?.customerStatuses || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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
      const section = i18n[lang]?.webhookLogs || i18n[lang]?.customerStatuses || i18n[lang]?.login || i18n[lang];
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

  initI18n('webhookLogs', 'webhookLogs');
  window.updateLangToggle();

  document.getElementById('applyFilterBtn').addEventListener('click', () => {
    logsPage = 1;
    loadLogs();
  });
  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterAction').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    logsPage = 1;
    loadLogs();
  });
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (logsPage > 1) { logsPage -= 1; loadLogs(); }
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    logsPage += 1; loadLogs();
  });
  document.getElementById('logModalClose').addEventListener('click', closeLogModal);
  document.getElementById('logModalCloseBtn').addEventListener('click', closeLogModal);
  document.getElementById('logModal').addEventListener('click', function (e) {
    if (e.target === this) closeLogModal();
  });
  document.getElementById('reprocessBtn').addEventListener('click', () => {
    if (selectedLogId) reprocessLog(selectedLogId);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('logModal').classList.contains('show')) closeLogModal();
  });

  loadLogs();
});