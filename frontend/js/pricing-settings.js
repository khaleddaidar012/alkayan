const API_URL = 'http://localhost:5000/api';

const PRICE_FIELDS = [
  { id: 'egypt_price', flag: '🇪🇬', currency: 'EGP', key: 'egypt' },
  { id: 'saudi_arabia_price', flag: '🇸🇦', currency: 'SAR', key: 'saudi_arabia' },
  { id: 'oman_price', flag: '🇴🇲', currency: 'OMR', key: 'oman' },
  { id: 'libya_price', flag: '🇱🇾', currency: 'LYD', key: 'libya' },
  { id: 'usd_fallback_price', flag: '🌍', currency: 'USD', key: 'usd_fallback' }
];

let currentSummary = null;

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
  const section = i18n[currentLang]?.pricing || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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

function formatNumber(n) {
  const num = Number(n) || 0;
  return num.toLocaleString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function renderSummary(prices) {
  currentSummary = prices || currentSummary;
  const container = document.getElementById('pricingSummary');
  if (!container) return;
  container.innerHTML = '';
  PRICE_FIELDS.forEach(field => {
    const amount = currentSummary[field.key]?.amount ?? 0;
    const row = document.createElement('div');
    row.className = 'pricing-summary-row';
    row.innerHTML = `
      <div class="pricing-summary-country">
        <span class="pricing-summary-flag">${field.flag}</span>
        <span>${t(field.key)}</span>
      </div>
      <div class="pricing-summary-price">${formatNumber(amount)} ${field.currency}</div>
    `;
    container.appendChild(row);
  });
}

function loadPrices() {
  return fetchPrices().then(prices => {
    if (!prices) throw new Error('load failed');
    const summaryPrices = {};
    PRICE_FIELDS.forEach(field => {
      const el = document.getElementById(field.id);
      if (el) el.value = prices[field.id] ?? 0;
      summaryPrices[field.key] = { amount: prices[field.id] ?? 0, currency: field.currency };
    });
    renderSummary(summaryPrices);
    return summaryPrices;
  }).catch(error => {
    showToast(t('loadError'), 'error');
    return null;
  });
}

async function savePrices() {
  const payload = {};
  for (const field of PRICE_FIELDS) {
    const el = document.getElementById(field.id);
    const val = parseFloat(el?.value);
    if (val === undefined || isNaN(val) || val < 0) {
      showToast(t('invalidPrice'), 'error');
      return;
    }
    const decimals = String(val).split('.')[1];
    if (decimals && decimals.length > 2) {
      showToast(t('invalidPrice'), 'error');
      return;
    }
    payload[field.id] = val;
  }

  const btn = document.getElementById('savePricesBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>${t('saving')}</span>`;

  try {
    const res = await fetch(`${API_URL}/settings/prices`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'save failed');
    renderSummary(data.prices);
    showToast(t('saved'), 'success');
  } catch (error) {
    showToast(t('saveError'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
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
  if (langBtn) langBtn.addEventListener('click', () => { switchLang(); if (currentSummary) renderSummary(currentSummary); });

  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.pricing || i18n[currentLang]?.nav || i18n[currentLang]?.login || i18n[currentLang];
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
      const section = i18n[lang]?.pricing || i18n[lang]?.login || i18n[lang];
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

  initI18n('pricing', 'pricing');
  window.updateLangToggle();

  document.getElementById('savePricesBtn').addEventListener('click', savePrices);

  loadPrices();
});