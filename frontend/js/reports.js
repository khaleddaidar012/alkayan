const API_URL = 'http://localhost:5000/api';

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EGP';
}

function formatPercent(v) {
  const n = parseFloat(v) || 0;
  return n.toFixed(1) + '%';
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

// ---- Render helpers ----
function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="table-empty">${message || 'No data available'}</td></tr>`;
}

function renderTopPrograms(list) {
  const body = document.getElementById('topProgramsBody');
  if (!list || list.length === 0) {
    body.innerHTML = emptyRow(5);
    return;
  }
  body.innerHTML = list.map(p => `
    <tr>
      <td class="program-name">${escapeHtml(p.name || 'Unknown')}</td>
      <td>${p.totalEnrollments ?? 0}</td>
      <td>${p.subscribed ?? 0}</td>
      <td class="revenue-positive">${formatCurrency(p.totalRevenue)}</td>
      <td>${formatCurrency(p.collectedRevenue)}</td>
    </tr>
  `).join('');
}

function renderProgramRevenue(list) {
  const body = document.getElementById('programRevenueBody');
  if (!list || list.length === 0) {
    body.innerHTML = emptyRow(4);
    return;
  }
  body.innerHTML = list.map(p => {
    const expected = parseFloat(p.expectedRevenue) || 0;
    const collected = parseFloat(p.collectedRevenue) || 0;
    const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    return `
    <tr>
      <td class="program-name">${escapeHtml(p._id || 'Unknown')}</td>
      <td>${formatCurrency(expected)}</td>
      <td class="revenue-positive">${formatCurrency(collected)}</td>
      <td class="revenue-negative">${formatCurrency(p.remainingRevenue)}</td>
    </tr>
    <tr class="progress-row">
      <td colspan="4">
        <div class="progress-wrap">
          <div class="progress-track"><div class="progress-fill" style="width: ${pct}%"></div></div>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function renderTopCampaigns(list) {
  const body = document.getElementById('topCampaignsBody');
  if (!list || list.length === 0) {
    body.innerHTML = emptyRow(5);
    return;
  }
  body.innerHTML = list.map(c => {
    const rate = parseFloat(c.conversionRate) || 0;
    return `
    <tr>
      <td class="program-name">${escapeHtml(c.name || 'Unknown')}</td>
      <td>${escapeHtml(c.programName || '—')}</td>
      <td>${c.leadsCount ?? 0}</td>
      <td>${c.registeredCustomers ?? 0}</td>
      <td>
        ${formatPercent(rate)}
        <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, rate)}%"></div></div>
      </td>
    </tr>
  `;
  }).join('');
}

function renderCampaignROI(list) {
  const body = document.getElementById('campaignROIBody');
  if (!list || list.length === 0) {
    body.innerHTML = emptyRow(5);
    return;
  }
  body.innerHTML = list.map(c => {
    const roi = parseFloat(c.roi) || 0;
    const roiCls = roi >= 0 ? 'roi-positive' : 'roi-negative';
    const barPct = Math.min(100, Math.max(0, roi));
    return `
    <tr>
      <td class="program-name">${escapeHtml(c.name || 'Unknown')}</td>
      <td>${formatCurrency(c.budget)}</td>
      <td class="revenue-positive">${formatCurrency(c.campaignRevenue)}</td>
      <td>${c.customerCount ?? 0}</td>
      <td>
        <span class="${roiCls}">${formatPercent(roi)}</span>
        <div class="progress-track"><div class="progress-fill ${roi >= 0 ? '' : 'progress-fill-negative'}" style="width: ${barPct}%"></div></div>
      </td>
    </tr>
  `;
  }).join('');
}

function renderTopEmployees(list) {
  const body = document.getElementById('topEmployeesBody');
  if (!list || list.length === 0) {
    body.innerHTML = emptyRow(5);
    return;
  }
  body.innerHTML = list.map(e => {
    const rate = parseFloat(e.conversionRate) || 0;
    return `
    <tr>
      <td>
        <div class="employee-cell">
          <span class="employee-name">${escapeHtml(e.name || 'Unknown')}</span>
          ${e.email ? `<span class="employee-email">${escapeHtml(e.email)}</span>` : ''}
        </div>
      </td>
      <td>${e.totalCustomers ?? 0}</td>
      <td class="revenue-positive">${e.subscribedCustomers ?? 0}</td>
      <td>${e.potentialCustomers ?? 0}</td>
      <td>
        ${formatPercent(rate)}
        <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, rate)}%"></div></div>
      </td>
    </tr>
  `;
  }).join('');
}

function renderRegistrations(list) {
  const chart = document.getElementById('registrationsChart');
  if (!list || list.length === 0) {
    chart.innerHTML = `<div class="table-empty">No registration data available</div>`;
    return;
  }

  const rows = [...list].sort((a, b) => {
    const ay = a._id.year, by = b._id.year, am = a._id.month, bm = b._id.month;
    return (ay - by) || (am - bm);
  });

  const maxCount = Math.max(...rows.map(r => r.count), 1);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  chart.innerHTML = rows.map(r => {
    const h = Math.max(6, Math.round((r.count / maxCount) * 100));
    const label = `${monthNames[(r._id.month || 1) - 1]} ${r._id.year}`;
    return `
    <div class="bar-col" title="${label}: ${r.count} registrations">
      <span class="bar-value">${r.count}</span>
      <div class="bar" style="height: ${h}%"></div>
      <span class="bar-label">${label}</span>
    </div>
  `;
  }).join('');
}

function renderReports(data) {
  document.getElementById('statExpected').textContent = formatCurrency(data.paymentStats?.totalExpected);
  document.getElementById('statCollected').textContent = formatCurrency(data.paymentStats?.totalReceived);
  document.getElementById('statRemaining').textContent = formatCurrency(data.paymentStats?.totalRemaining);
  document.getElementById('statWithBalance').textContent = data.paymentStats?.withBalance ?? '—';

  renderTopPrograms(data.topPrograms);
  renderProgramRevenue(data.programRevenue);
  renderTopCampaigns(data.topCampaigns);
  renderCampaignROI(data.campaignROI);
  renderTopEmployees(data.topEmployees);
  renderRegistrations(data.registrationsOverTime);
}

async function loadReports() {
  const data = await apiFetch('/reports/aggregated');
  if (!data) {
    const emptyCols = ['topProgramsBody', 'programRevenueBody', 'topCampaignsBody', 'campaignROIBody', 'topEmployeesBody'];
    emptyCols.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = emptyRow(5, 'Failed to load reports');
    });
    return;
  }
  renderReports(data);
}

// ---- Event wiring ----
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

  initI18n('reports', 'reports');
  initTheme();

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;

  initSidebar();

  const langBtn = document.getElementById('langToggle2');
  if (langBtn) langBtn.addEventListener('click', switchLang);
  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const s = i18n[currentLang]?.reports || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${s.langSwitch || ''}`;
    }
  };

  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const s = i18n[currentLang]?.reports || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
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

  loadReports();
}

document.addEventListener('DOMContentLoaded', init);
