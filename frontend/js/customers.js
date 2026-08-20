const API_URL = 'http://localhost:5000/api';

let allCustomers = [];
let editingCustomerId = null;
let deleteCustomerId = null;
let currentView = 'list';
let currentCustomerId = null;
let returnToDetailsAfterEdit = null;
let programPriceMap = {};

function can(module, action) {
  const user = getUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions && user.permissions[module] && user.permissions[module][action] === true;
}

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

function formatCurrency(v, currency) {
  const n = parseFloat(v) || 0;
  const code = currency || 'EGP';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + code;
}

function customerDisplayName(c) {
  if (!c) return '—';
  return c.name_ar || c.name_en || c.name || '—';
}

function countryBadge(c, size) {
  if (!c) return '';
  const code = c.country || 'other';
  const info = COUNTRIES[code] || COUNTRIES.other;
  const name = countryDisplayName(code, currentLang);
  const label = size === 'lg'
    ? `${info.flag} ${name}`
    : `${info.flag} ${currentLang === 'ar' ? info.nameAr : info.nameEn}`;
  return `<span class="customer-country-badge" title="${info.nameEn}">${label}</span>`;
}

function programPriceForCustomer(c) {
  const country = c?.country || 'other';
  return formatPriceForCountry(country, null, currentLang);
}

function countryPriceRow(c, opts) {
  const country = c?.country || 'other';
  const formatted = formatPriceForCountry(country, null, currentLang);
  const flag = (COUNTRIES[country] || COUNTRIES.other).flag;
  const currencyInfo = currencyInfoForCountry(country);
  const size = opts?.size || 'sm';
  return `
    <div class="details-row">
      <span class="details-label">💰 ${t('programPrice')}</span>
      <span class="details-value country-price-value">
        <span class="country-price">${flag} ${formatted}</span>
        ${size === 'lg' ? `<span class="country-price-currency">${currencyInfo.nameEn}</span>` : ''}
      </span>
    </div>`;
}

function priceDisplay(label, value, opts) {
  const o = opts || {};
  return `<div class="price-display ${o.size === 'lg' ? 'price-display-lg' : ''} ${o.color ? 'price-display-' + o.color : ''}">
    ${label ? `<div class="price-label">${label}</div>` : ''}
    <div class="price-value">${formatCurrency(value, o.currency)}</div>
  </div>`;
}

function t(key) {
  const section = i18n[currentLang]?.customers || i18n[currentLang]?.nav || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
  if (section && section[key]) return section[key];
  const paySection = i18n[currentLang]?.payments || {};
  if (paySection[key]) return paySection[key];
  const commSection = i18n[currentLang]?.communications || {};
  if (commSection[key]) return commSection[key];
  const statusSection = i18n[currentLang]?.status || {};
  return statusSection[key] || key;
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
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', options);
}

function formatPayDate(d) {
  return d ? new Date(d).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
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

async function loadCustomers() {
  showSkeletons();
  hideError();
  const data = await apiFetch('/customers');
  if (!data) {
    hideSkeletons();
    showError();
    return;
  }
  allCustomers = data.customers || [];
  hideSkeletons();
  renderStats();
  populateFilterDropdowns();
  applyFilters();
}

function showSkeletons() {
  const grid = document.getElementById('customersGrid');
  const empty = document.getElementById('customersEmpty');
  const stats = document.getElementById('customersStats');
  const error = document.getElementById('customersError');
  if (grid) {
    grid.classList.add('loading');
    grid.innerHTML = Array(6).fill(`
      <div class="skeleton-card">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-line skeleton-line-sm"></div>
        <div class="skeleton-line skeleton-line-xs"></div>
        <div class="skeleton-status"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-xs"></div>
      </div>
    `).join('');
  }
  if (empty) empty.classList.remove('show');
  if (stats) stats.classList.add('stats-loading');
  if (error) error.style.display = 'none';
}

function hideSkeletons() {
  const grid = document.getElementById('customersGrid');
  const stats = document.getElementById('customersStats');
  if (grid) grid.classList.remove('loading');
  if (stats) stats.classList.remove('stats-loading');
}

function showError() {
  const grid = document.getElementById('customersGrid');
  const error = document.getElementById('customersError');
  if (grid) grid.innerHTML = '';
  if (error) error.style.display = 'block';
}

function hideError() {
  const error = document.getElementById('customersError');
  if (error) error.style.display = 'none';
}

async function loadEmployees() {
  const data = await apiFetch('/users');
  if (!data) return;
  return data.users || [];
}

// ---- Render ----
function renderCustomers(filteredCustomers) {
  const grid = document.getElementById('customersGrid');
  const empty = document.getElementById('customersEmpty');
  if (!grid) return;

  const customers = filteredCustomers || allCustomers;

  if (customers.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.add('show');
    return;
  }
  if (empty) empty.classList.remove('show');

  grid.innerHTML = customers.map(c => {
    const displayName = customerDisplayName(c);
    const initial = (displayName.charAt(0) || '?').toUpperCase();
    const statusClass = c.status || 'potential';
    const statusKey = statusClass;
    const whatsapp = c.whatsapp || c.whatsapp_number || c.phone || '—';
    const waPhone = c.whatsapp || c.whatsapp_number || c.phone || '';
    const program = c.program || '—';
    const employeeName = c.assignedEmployee?.name || '—';
    const pay = c.payment || {};
    const ps = pay.status || 'notPaid';
    const total = pay.finalPrice || 0;
    const paid = pay.paidAmount || 0;
    const remaining = pay.remainingAmount || 0;
    const debtBalance = c.debt_balance || 0;
    const payCurrency = pay.currency || currencyInfoForCountry(c.country || 'other').code;
    const debtBadge = debtBalance > 0
      ? `<span class="card-debt-badge">⚠️ ${t('outstanding')}: ${formatCurrency(debtBalance, payCurrency)}</span>`
      : '';

    let subIcon = '';
    let subLabel = '';
    if (statusClass === 'subscribed') {
      subIcon = '🟢'; subLabel = t('subscribed');
    } else if (statusClass === 'potential') {
      subIcon = '⭐'; subLabel = t('potential');
    } else {
      subIcon = '🔴'; subLabel = t(statusKey);
    }

    const paySection = `
      <div class="card-pay-section">
        <div class="card-pay-total">${priceDisplay(t('totalAmount'), total, { size: 'lg', color: 'default', currency: payCurrency })}</div>
        <div class="card-pay-row"><span>✅ ${t('paidAmount')}:</span><span class="card-pay-value green">${formatCurrency(paid, payCurrency)}</span></div>
        <div class="card-pay-row"><span>⏳ ${t('remainingAmount')}:</span><span class="card-pay-value ${remaining > 0 ? 'gold' : 'green'}">${formatCurrency(remaining, payCurrency)}</span></div>
        <div class="card-pay-footer">
          <span class="payment-badge ${ps}">${subIcon} ${subLabel}</span>
          ${statusClass === 'subscribed' && can('customers', 'edit') ? `<button class="btn btn-xs card-pay-btn" data-pay="${c._id}">➕ ${t('addPayment')}</button>` : ''}
        </div>
      </div>`;

    const waLink = waPhone ? `https://wa.me/${waPhone.replace(/[^0-9]/g, '')}` : '#';
    const commCount = c.communication_count || 0;

    return `
      <div class="customer-card" data-id="${c._id}">
        <div class="customer-card-actions" ${!can('customers', 'edit') && !can('customers', 'delete') ? 'style="display:none"' : ''}>
          ${can('customers', 'edit') ? `<button class="card-action-btn card-edit-btn" data-edit="${c._id}" title="${t('edit')}">✏️</button>` : ''}
          ${can('customers', 'delete') ? `<button class="card-action-btn card-delete-btn" data-delete="${c._id}" title="${t('delete')}">🗑️</button>` : ''}
        </div>
        <div class="customer-card-top">
          <div class="customer-avatar">${initial}</div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <span class="customer-status-badge ${statusClass}">${subIcon} ${t(statusKey)}</span>
            ${countryBadge(c)}
          </div>
        </div>
        <div class="customer-card-name">${displayName}</div>
        <div style="padding:0 16px 8px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
          ${statusBadgeHtml(c, { size: 'sm' })}
          <span>·</span>
          <span>${t('totalAmount')}: ${formatCurrency(total, payCurrency)}</span>
        </div>
        ${debtBadge}
        ${paySection}
        <div class="comm-count-chip" data-comm="${c._id}" title="${t('communicationCount')}">
          <span class="comm-count-icon">📞</span>
          <span class="comm-count-num">${commCount}</span>
        </div>
        <div class="card-msg-slider" data-msg-cid="${c._id}">
          <div class="msg-slider-inner">
            <div class="msg-slider-empty">${t('noMessages')}</div>
          </div>
        </div>
        <div class="customer-card-details">
          <div class="customer-card-detail">
            <span class="detail-icon">💬</span>
            <span>${whatsapp}</span>
          </div>
          ${waPhone ? `<div class="customer-card-detail">
            <a href="${waLink}" target="_blank" rel="noopener" class="wa-btn" data-wa="${c._id}" title="${t('whatsapp')}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:#25D366;color:#fff;font-size:11px;text-decoration:none">
              💬 ${t('whatsapp')}
            </a>
          </div>` : ''}
          <div class="customer-card-detail">
            <span class="detail-icon">📚</span>
            <span>${program}</span>
          </div>
          <div class="customer-card-detail">
            <span class="detail-icon">💰</span>
            <span class="country-price-badge">${programPriceForCustomer(c)}</span>
          </div>
          <div class="customer-card-detail">
            <span class="detail-icon">👤</span>
            <span>${employeeName}</span>
          </div>
          <div class="customer-card-detail">
            <span class="detail-icon">📅</span>
            <span>${formatDate(c.registrationDate)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (grid.__customersClickHandler) {
    grid.removeEventListener('click', grid.__customersClickHandler);
  }
  grid.__customersClickHandler = function (e) {
    const card = e.target.closest('.customer-card');
    const payBtn = e.target.closest('.card-pay-btn');
    const editBtn = e.target.closest('.card-edit-btn');
    const delBtn = e.target.closest('.card-delete-btn');
    const waBtn = e.target.closest('[data-wa]');
    const commChip = e.target.closest('[data-comm]');
    const csBadge = e.target.closest('[data-cs-badge]');
    if (csBadge) { e.stopPropagation(); if (can('customers', 'edit')) openStatusDropdown(csBadge.dataset.csBadge, csBadge); return; }
    if (waBtn) { e.stopPropagation(); e.preventDefault(); incrementCommunication(waBtn.dataset.wa); const href = waBtn.getAttribute('href'); if (href && href !== '#') window.open(href, '_blank', 'noopener'); return; }
    if (commChip) { e.stopPropagation(); incrementCommunication(commChip.dataset.comm); return; }
    if (payBtn) { e.stopPropagation(); const c = allCustomers.find(x => x._id === payBtn.dataset.pay); if (c) openAddPaymentModal(c); return; }
    if (editBtn) { e.stopPropagation(); openEditModal(editBtn.dataset.edit); return; }
    if (delBtn) { e.stopPropagation(); openDeleteModal(delBtn.dataset.delete); return; }
    if (card) showCustomerDetails(card.dataset.id);
  };
  grid.addEventListener('click', grid.__customersClickHandler);

  loadCardMessageSliders(customers);
}

function renderStats() {
  const total = allCustomers.length;
  const subscribed = allCustomers.filter(c => c.status === 'subscribed').length;
  const potential = allCustomers.filter(c => c.status === 'potential').length;
  const rejected = allCustomers.filter(c => c.status === 'rejected').length;

  const subscribedCusts = allCustomers.filter(c => c.status === 'subscribed');
  const totalExpected = subscribedCusts.reduce((s, c) => s + (c.payment?.finalPrice || 0), 0);
  const totalReceived = subscribedCusts.reduce((s, c) => s + (c.payment?.paidAmount || 0), 0);
  const totalRemaining = subscribedCusts.reduce((s, c) => s + (c.payment?.remainingAmount || 0), 0);
  const fullyPaid = subscribedCusts.filter(c => c.payment?.status === 'fullyPaid').length;

  const el = (id) => document.getElementById(id);
  if (el('statTotal')) el('statTotal').textContent = total;
  if (el('statSubscribed')) el('statSubscribed').textContent = subscribed;
  if (el('statPotential')) el('statPotential').textContent = potential;
  if (el('statRejected')) el('statRejected').textContent = rejected;
  if (el('statExpectedRev')) el('statExpectedRev').textContent = formatCurrency(totalExpected);
  if (el('statReceivedRev')) el('statReceivedRev').textContent = formatCurrency(totalReceived);
  if (el('statRemainingRev')) el('statRemainingRev').textContent = formatCurrency(totalRemaining);
  if (el('statFullyPaid')) el('statFullyPaid').textContent = fullyPaid;
}

async function showCustomerDetails(customerId) {
  currentCustomerId = customerId;
  currentView = 'details';

  const data = await apiFetch(`/customers/${customerId}`);
  if (!data || !data.customer) return;

  const customer = data.customer;

  const grid = document.getElementById('customersGrid');
  const empty = document.getElementById('customersEmpty');
  const details = document.getElementById('customerDetails');
  const toolbar = document.querySelector('.customers-toolbar');
  const filters = document.getElementById('filtersBar');

  if (grid) grid.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (toolbar) toolbar.style.display = 'none';
  if (filters) filters.style.display = 'none';
  if (details) {
    details.style.display = 'block';
    populateDetails(customer);

    const editBtn = document.getElementById('detailsEditBtn');
    if (editBtn) {
      editBtn.onclick = function () {
        returnToDetailsAfterEdit = customerId;
        hideCustomerDetails();
        openEditModal(customerId);
      };
    }

    const deleteBtn = document.getElementById('detailsDeleteBtn');
    if (deleteBtn) {
      deleteBtn.onclick = function () {
        hideCustomerDetails();
        openDeleteModal(customerId);
      };
    }
  }
}

function populateDetails(customer) {
  const container = document.getElementById('detailsContent');
  if (!container) return;

  const statusKey = customer.status || 'potential';
  const whatsapp = customer.whatsapp || customer.phone || '—';
  const waPhone = customer.whatsapp || customer.phone || '';
  const program = customer.program || '—';
  const employeeName = customer.assignedEmployee?.name || t('none');
  const isSubscribed = statusKey === 'subscribed';
  const isRejected = statusKey === 'rejected';

  const pay = customer.payment || {};
  const payStatusKey = pay.status || 'notPaid';
  const payCurrency = pay.currency || currencyInfoForCountry(customer.country || 'other').code;
  const history = pay.history || [];

  const methodLabels = { cash: 'Cash', instapay: 'InstaPay', bankTransfer: 'Bank Transfer', vodafoneCash: 'Vodafone Cash', other: 'Other' };

  container.innerHTML = `
    <div class="details-card">
      <div class="details-card-header">
        <h3>${t('basicInfo')}</h3>
        <div>
          <span class="customer-status-badge ${statusKey}">${t(statusKey)}</span>
          ${can('customers', 'edit') ? `<button class="btn btn-sm" id="detailsEditBtn" style="margin-inline-start:8px">✏️ ${t('edit')}</button>` : ''}
          ${can('customers', 'delete') ? `<button class="btn btn-sm" id="detailsDeleteBtn" style="margin-inline-start:4px;background:var(--danger)">🗑️ ${t('delete')}</button>` : ''}
        </div>
      </div>
      <div class="details-row">
        <span class="details-label">${t('name')}</span>
        <span class="details-value">${customerDisplayName(customer)}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('country')}</span>
        <span class="details-value">${countryBadge(customer, 'lg')}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('nameAr')}</span>
        <span class="details-value" dir="rtl">${customer.name_ar || '—'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('nameEn')}</span>
        <span class="details-value" dir="ltr">${customer.name_en || '—'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('phone')}</span>
        <span class="details-value">${customer.phone}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('whatsapp')}</span>
        <span class="details-value">${whatsapp} ${waPhone ? `<a href="https://wa.me/${waPhone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" data-wa="${customer._id}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;background:#25D366;color:#fff;font-size:11px;text-decoration:none;margin-inline-start:8px">💬 ${t('whatsapp')}</a>` : ''}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('email')}</span>
        <span class="details-value">${customer.email || '—'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('address')}</span>
        <span class="details-value">${customer.address || '—'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('program')}</span>
        <span class="details-value">${program}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('campaign')}</span>
        <span class="details-value">${customer.campaign?.name || '—'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('assignedEmployee')}</span>
        <span class="details-value">${employeeName}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('registrationDate')}</span>
        <span class="details-value">${formatDate(customer.registrationDate)}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('notes')}</span>
        <span class="details-value">${customer.notes || '—'}</span>
      </div>
    </div>

    <!-- Payment Summary -->
    <div class="details-card">
      <div class="details-card-header">
        <h3>💰 ${t('payment')}</h3>
      </div>
      <div class="details-row">
        <span class="details-label">${t('paymentStatus')}</span>
        <span class="details-value">
          <span class="payment-badge ${payStatusKey}">
            ${payStatusKey === 'fullyPaid' ? '🟢' : payStatusKey === 'partiallyPaid' ? '🟡' : '🔴'} ${t(payStatusKey)}
          </span>
        </span>
      </div>
      ${countryPriceRow(customer)}
      <div class="details-row">
        <span class="details-label">${t('totalAmount')}</span>
        <span class="details-value">${priceDisplay('', pay.finalPrice, { size: 'lg', color: 'gold', currency: payCurrency })}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('paidAmount')}</span>
        <span class="details-value" style="color:var(--success)">${formatCurrency(pay.paidAmount, payCurrency)}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('remainingAmount')}</span>
        <span class="details-value" style="color:${(pay.remainingAmount || 0) > 0 ? 'var(--warning)' : 'var(--success)'}">${formatCurrency(pay.remainingAmount, payCurrency)}</span>
      </div>
    </div>

    <!-- Status Management -->
    <div class="details-card">
      <div class="details-card-header">
        <h3>${t('statusManagement')}</h3>
      </div>
      <div class="details-row">
        <span class="details-label">${t('status')}</span>
        <select id="statusSelect" class="details-select">
          <option value="subscribed" ${statusKey === 'subscribed' ? 'selected' : ''}>${t('subscribed')}</option>
          <option value="potential" ${statusKey === 'potential' ? 'selected' : ''}>${t('potential')}</option>
          <option value="thinking" ${statusKey === 'thinking' ? 'selected' : ''}>${t('thinking')}</option>
          <option value="noResponse" ${statusKey === 'noResponse' ? 'selected' : ''}>${t('noResponse')}</option>
          <option value="rejected" ${statusKey === 'rejected' ? 'selected' : ''}>${t('rejected')}</option>
        </select>
      </div>

      <!-- Payment fields (shown when subscribed) -->
      <div id="statusPaymentFields" style="${isSubscribed ? '' : 'display:none'}">
        <div class="details-row">
          <span class="details-label">${t('programPrice')}</span>
          <input type="number" id="payProgramPrice" class="details-input" value="${pay.programPrice || ''}" min="0" step="1">
        </div>
        <div class="details-row">
          <span class="details-label">${t('discount')}</span>
          <input type="number" id="payDiscount" class="details-input" value="${pay.discount || ''}" min="0" step="1">
        </div>
        <div class="details-row">
          <span class="details-label">${t('finalPrice')}</span>
          <span class="details-value" id="payFinalPrice">${formatCurrency(pay.finalPrice, payCurrency)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">${t('initialPayment')}</span>
          <input type="number" id="payInitial" class="details-input" value="${pay.initialPayment || ''}" min="0" step="1">
        </div>
        <div class="details-row">
          <span class="details-label">${t('paidAmount')}</span>
          <span class="details-value" id="payPaidDisplay">${formatCurrency(pay.paidAmount, payCurrency)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">${t('remainingAmount')}</span>
          <span class="details-value" id="payRemaining">${formatCurrency(pay.remainingAmount, payCurrency)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">${t('paymentMethod')}</span>
          <select id="payMethod" class="details-select">
            ${Object.entries(methodLabels).map(([v, l]) => `<option value="${v}" ${pay.paymentMethod === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="details-row">
          <span class="details-label">${t('nextPaymentDate')}</span>
          <input type="date" id="payNextDate" class="details-input" value="${pay.nextPaymentDate ? pay.nextPaymentDate.split('T')[0] : ''}">
        </div>
      </div>

      <!-- Payment History (shown for subscribed) -->
      ${isSubscribed ? `
      <div class="payment-history-section">
        <div class="payment-history-header">
          <h4>${t('paymentHistory')}</h4>
          <div>
            <span class="payment-badge ${payStatusKey}">${t(payStatusKey)}</span>
            ${can('customers', 'edit') ? `<button class="btn btn-sm" id="addPaymentBtn" style="margin-inline-start:8px">➕ ${t('addPayment')}</button>` : ''}
          </div>
        </div>
        ${history.length > 0 ? `
        <table class="payment-history-table">
          <thead><tr><th>${t('date')}</th><th>${t('time') || 'Time'}</th><th>${t('amount')}</th><th>${t('paymentMethod')}</th><th>${t('referenceNumber')}</th><th>${t('notes')}</th>${can('customers', 'edit') ? `<th>${t('actions') || 'Actions'}</th>` : ''}</tr></thead>
          <tbody>
            ${history.map(r => `
              <tr>
                <td>${formatPayDate(r.date)}</td>
                <td style="font-size:11px;color:var(--text-muted)">${r.time || '—'}</td>
                <td>${formatCurrency(r.amount)}</td>
                <td>${methodLabels[r.method] || r.method || '—'}</td>
                <td>${r.referenceNumber || '—'}</td>
                <td>${r.notes || '—'}</td>
                ${can('customers', 'edit') ? `<td>
                  <button class="pay-row-btn pay-row-btn-del" data-delpay="${r._id}" title="${t('deletePayment')}">🗑️</button>
                </td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>` : `<p style="color:var(--text-secondary);padding:8px 0">${t('noPaymentsYet')}</p>`}
        <div class="payment-summary">
          <span>${t('totalPaid')}: <strong>${formatCurrency(pay.paidAmount)}</strong></span>
          <span>${t('remainingAmount')}: <strong>${formatCurrency(pay.remainingAmount)}</strong></span>
        </div>
      </div>` : ''}

      <!-- Financial Ledger (Task 3) -->
      <div class="payment-history-section ledger-section">
        <div class="payment-history-header">
          <h4>📒 ${t('paymentHistory')}</h4>
          ${can('customers', 'edit') ? `<button class="btn btn-sm" id="ledgerAddBtn" style="margin-inline-start:8px">➕ ${t('recordPayment')}</button>` : ''}
        </div>
        <div id="paymentLedger">
          <p style="color:var(--text-muted);padding:8px 0">${t('noPayments')}</p>
        </div>
      </div>

      <!-- Rejection fields (shown when rejected) -->
      <div id="statusRejectionFields" style="${isRejected ? '' : 'display:none'}">
        <div class="details-row">
          <span class="details-label">${t('rejectionReason')}</span>
          <select id="rejectReason" class="details-select">
            <option value="" ${!customer.rejectionReason ? 'selected' : ''}>—</option>
            <option value="priceHigh" ${customer.rejectionReason === 'priceHigh' ? 'selected' : ''}>${t('priceHigh')}</option>
            <option value="notInterested" ${customer.rejectionReason === 'notInterested' ? 'selected' : ''}>${t('notInterested')}</option>
            <option value="other" ${customer.rejectionReason === 'other' ? 'selected' : ''}>${t('other')}</option>
          </select>
        </div>
        <div class="details-row" id="rejectCustomRow" style="${customer.rejectionReason === 'other' ? '' : 'display:none'}">
          <span class="details-label">${t('rejectionCustomReason')}</span>
          <input type="text" id="rejectCustom" class="details-input" value="${customer.rejectionCustomReason || ''}">
        </div>
      </div>

      <div style="margin-top:16px;text-align:end">
        <button class="btn btn-primary" id="saveStatusBtn">${t('save')}</button>
      </div>
    </div>

    <!-- Customer Status (Task 5) -->
    <div class="details-card">
      <div class="details-card-header">
        <h3>🏷️ ${t('status')}</h3>
      </div>
      <div class="details-row">
        <span class="details-label">${t('changeStatus')}</span>
        <span class="details-value">
          <span id="csDetailBadgeWrap">${statusBadgeHtml(customer, { size: 'lg' })}</span>
          <select id="csStatusSelect" class="details-select" style="margin-inline-start:8px;min-width:170px">
            <option value="">${t('changeStatus')}...</option>
          </select>
          <input type="text" id="csStatusNotes" class="details-input" placeholder="${t('addNote')}" style="margin-inline-start:8px;min-width:140px" maxlength="500">
          ${can('customers', 'edit') ? `<button class="btn btn-sm" id="csApplyBtn" style="margin-inline-start:8px">${t('save')}</button>` : ''}
        </span>
      </div>
      <div class="cs-history-section">
        <div class="payment-history-header">
          <h4>📜 ${t('statusHistory')}</h4>
        </div>
        <div id="csHistoryBox" class="cs-history-box">
          <p style="color:var(--text-muted);padding:8px 0">…</p>
        </div>
        <div style="text-align:center;margin-top:8px">
          <button class="btn btn-ghost btn-sm" id="csHistoryMoreBtn" style="display:none">${t('loadMore')}</button>
        </div>
      </div>
    </div>

    <!-- Communications (Task 4) -->
    <div class="details-card">
      <div class="details-card-header">
        <h3>📞 ${t('communications')}</h3>
        ${can('customers', 'edit') ? `<button class="btn btn-sm" id="addCommBtn" style="margin-inline-start:8px">➕ ${t('addCommunication')}</button>` : ''}
      </div>
      <div id="commStats" class="comm-stats-box"><p style="color:var(--text-muted);padding:8px 0">…</p></div>
      <div class="comm-filter-row">
        <select id="commTypeFilter" class="details-select" style="max-width:220px">
          <option value="">${t('allTypes')}</option>
        </select>
      </div>
      <div id="commLogBox" class="comm-log-box">
        <p style="color:var(--text-muted);padding:8px 0">${t('noCommunications')}</p>
      </div>
    </div>

    <!-- Messages (Task 4) -->
    <div class="details-card">
      <div class="details-card-header">
        <h3>💬 ${t('messages')}</h3>
        ${can('customers', 'edit') ? `<button class="btn btn-sm" id="addMsgBtn" style="margin-inline-start:8px">➕ ${t('addMessage')}</button>` : ''}
      </div>
      <div id="msgChatBox" class="msg-chat-box">
        <p style="color:var(--text-muted);padding:12px 0;text-align:center">${t('noMessages')}</p>
      </div>
      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-ghost btn-sm" id="msgLoadMoreBtn" style="display:none">${t('loadMore')}</button>
      </div>
    </div>
  `;

  // Wire status change events
  const statusSelect = document.getElementById('statusSelect');
  const payFields = document.getElementById('statusPaymentFields');
  const rejectFields = document.getElementById('statusRejectionFields');
  const payProgramPrice = document.getElementById('payProgramPrice');
  const payDiscount = document.getElementById('payDiscount');
  const payFinal = document.getElementById('payFinalPrice');
  const payInitial = document.getElementById('payInitial');
  const payPaidDisp = document.getElementById('payPaidDisplay');
  const payRemain = document.getElementById('payRemaining');
  const rejectReason = document.getElementById('rejectReason');
  const rejectCustomRow = document.getElementById('rejectCustomRow');

  const updatePaymentCalcs = () => {
    const pp = parseFloat(payProgramPrice?.value) || 0;
    const disc = parseFloat(payDiscount?.value) || 0;
    const fp = Math.max(0, pp - disc);
    const ip = parseFloat(payInitial?.value) || 0;
    const paid = parseFloat(payPaidDisp?.textContent.replace(/[^0-9.]/g, '')) || 0;
    const actualPaid = Math.max(ip, paid);
    if (payFinal) payFinal.textContent = formatCurrency(fp);
    if (payRemain) payRemain.textContent = formatCurrency(Math.max(0, fp - actualPaid));
  };

  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      const val = this.value;
      if (payFields) payFields.style.display = val === 'subscribed' ? '' : 'none';
      if (rejectFields) rejectFields.style.display = val === 'rejected' ? '' : 'none';
    });
  }

  if (rejectReason) {
    rejectReason.addEventListener('change', function () {
      if (rejectCustomRow) rejectCustomRow.style.display = this.value === 'other' ? '' : 'none';
    });
  }

  if (payProgramPrice) payProgramPrice.addEventListener('input', updatePaymentCalcs);
  if (payDiscount) payDiscount.addEventListener('input', updatePaymentCalcs);
  if (payInitial) payInitial.addEventListener('input', updatePaymentCalcs);

  // Add Payment button
  const addPayBtn = document.getElementById('addPaymentBtn');
  if (addPayBtn) {
    addPayBtn.addEventListener('click', () => openAddPaymentModal(customer));
  }

  const ledgerAddBtn = document.getElementById('ledgerAddBtn');
  if (ledgerAddBtn) {
    ledgerAddBtn.addEventListener('click', () => openAddPaymentModal(customer));
  }

  const addCommBtn = document.getElementById('addCommBtn');
  if (addCommBtn) addCommBtn.addEventListener('click', () => openAddCommunicationModal(customer._id));

  const addMsgBtn = document.getElementById('addMsgBtn');
  if (addMsgBtn) addMsgBtn.addEventListener('click', () => openAddMessageModal(customer._id));

  const commTypeFilter = document.getElementById('commTypeFilter');
  if (commTypeFilter) {
    commTypeFilter.addEventListener('change', () => loadCommList(customer._id, document.getElementById('commLogBox'), commTypeFilter.value));
  }

  const msgLoadMoreBtn = document.getElementById('msgLoadMoreBtn');
  if (msgLoadMoreBtn) {
    msgLoadMoreBtn.addEventListener('click', () => {
      msgPage += 1;
      loadMessageList(customer._id, msgPage, false);
    });
  }

  loadCommunicationSection(customer);
  loadMessageSection(customer);

  // Customer Status (Task 5) wiring
  const csStatusSelect = document.getElementById('csStatusSelect');
  if (csStatusSelect) {
    loadStatusOptions().then(statuses => {
      csStatusSelect.innerHTML = `<option value="">${t('changeStatus')}...</option>` + statuses.map(s => {
        const currentId = customer.status_id ? customer.status_id._id : '';
        const mappedKey = s.name.toLowerCase().replace(/\s+/g, '');
        const display = ({ new: t('new'), contacted: t('contacted'), transferredtophone: t('transferredToPhone'), interested: t('interested'), notinterested: t('notInterested'), subscribed: t('subscribed'), cancelled: t('cancelled') })[mappedKey] || s.name;
        return `<option value="${s._id}" ${String(s._id) === String(currentId) ? 'selected' : ''}>${escapeHtml(display)}</option>`;
      });
    });
    csStatusSelect.addEventListener('change', function () {
      if (this.value) {
        const st = statusCache.find(s => String(s._id) === String(this.value));
        if (st) {
          const wrap = document.getElementById('csDetailBadgeWrap');
          if (wrap) wrap.innerHTML = statusBadgeHtml({ _id: customer._id, status_id: st }, { size: 'lg' });
        }
      } else {
        const wrap = document.getElementById('csDetailBadgeWrap');
        if (wrap) wrap.innerHTML = statusBadgeHtml(customer, { size: 'lg' });
      }
    });
  }
  const csApplyBtn = document.getElementById('csApplyBtn');
  if (csApplyBtn) {
    csApplyBtn.addEventListener('click', async () => {
      const sid = csStatusSelect.value;
      if (!sid) return;
      const notes = document.getElementById('csStatusNotes')?.value || '';
      const ok = await updateCustomerStatus(customer._id, sid, notes);
      if (ok && csStatusSelect) {
        const mapped = statusCache.find(s => String(s._id) === String(sid));
        if (mapped) {
          const wrap = document.getElementById('csDetailBadgeWrap');
          if (wrap) wrap.innerHTML = statusBadgeHtml({ _id: customer._id, status_id: mapped }, { size: 'lg' });
        }
        document.getElementById('csStatusNotes').value = '';
      }
    });
  }
  statusHistoryPage = 1;
  loadStatusHistory(customer._id, 1, false);
  const csMoreBtn = document.getElementById('csHistoryMoreBtn');
  if (csMoreBtn) {
    csMoreBtn.addEventListener('click', () => {
      statusHistoryPage += 1;
      loadStatusHistory(customer._id, statusHistoryPage, true);
    });
  }

  document.querySelectorAll('#detailsContent [data-wa]').forEach(a => {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      incrementCommunication(this.dataset.wa);
      const href = this.getAttribute('href');
      if (href && href !== '#') window.open(href, '_blank', 'noopener');
    });
  });

  // Delete payment record buttons (embedded history)
  document.querySelectorAll('[data-delpay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('confirmDeletePayment'))) return;
      const result = await apiFetch(`/customers/${customer._id}/payments/${btn.dataset.delpay}`, { method: 'DELETE' });
      if (result && result.customer) {
        showToast(t('paymentDeleted'), 'success');
        const idx = allCustomers.findIndex(c => c._id === result.customer._id);
        if (idx !== -1) allCustomers[idx] = result.customer;
        renderStats();
        applyFilters();
        showCustomerDetails(result.customer._id);
      }
    });
  });

  const saveBtn = document.getElementById('saveStatusBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function () {
      saveBtn.disabled = true;
      saveBtn.classList.add('loading');
      saveBtn.innerHTML = '<span class="spinner"></span>';

      const body = { status: document.getElementById('statusSelect').value };

      if (body.status === 'subscribed') {
        const pp = parseFloat(document.getElementById('payProgramPrice')?.value) || 0;
        const disc = parseFloat(document.getElementById('payDiscount')?.value) || 0;
        const fp = Math.max(0, pp - disc);
        body.payment = {
          programPrice: pp, discount: disc, finalPrice: fp,
          initialPayment: parseFloat(document.getElementById('payInitial')?.value) || 0,
          paidAmount: pay.paidAmount || 0,
          remainingAmount: Math.max(0, fp - (pay.paidAmount || 0)),
          nextPaymentDate: document.getElementById('payNextDate')?.value || null,
          paymentMethod: document.getElementById('payMethod')?.value || 'cash'
        };
      }

      if (body.status === 'rejected') {
        body.rejectionReason = document.getElementById('rejectReason').value;
        body.rejectionCustomReason = document.getElementById('rejectCustom')?.value || '';
      }

      const result = await apiFetch(`/customers/${customer._id}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      if (result && result.customer) {
        showToast(t('customerUpdated'), 'success');
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
        saveBtn.textContent = t('save');
        const idx = allCustomers.findIndex(c => c._id === customer._id);
        if (idx !== -1) allCustomers[idx] = result.customer;
        renderStats();
        applyFilters();
        showCustomerDetails(customer._id);
      } else {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
        saveBtn.textContent = t('save');
      }
    });
  }

  renderPaymentLedger(customer._id);
}

// ---- Payment Ledger (Task 3) ----
async function renderPaymentLedger(customerId) {
  const container = document.getElementById('paymentLedger');
  if (!container) return;
  container.innerHTML = `<p style="color:var(--text-muted);padding:12px 0">${t('noPayments')}</p>`;
  try {
    const [listData, sumData] = await Promise.all([
      apiFetch(`/customers/${customerId}/payments?limit=100`),
      apiFetch(`/customers/${customerId}/payments/summary`)
    ]);
    const payments = listData?.payments || [];
    const summary = sumData?.summary || { total_in: 0, total_out: 0, balance: 0 };

    const rows = payments.length ? payments.map(p => `
      <tr>
        <td>${formatPayDate(p.created_at)}</td>
        <td><span class="pm-direction-badge ${p.direction}">${p.direction === 'in' ? '⬅' : '➡'} ${t(p.direction)}</span></td>
        <td><strong>${formatCurrency(p.amount)}</strong> <span class="pm-currency">${p.currency}</span></td>
        <td>${p.method?.name || p.methodName || '—'}</td>
        <td>${p.receipt_url ? `<a class="pm-receipt-link" href="${p.receipt_url}" target="_blank" rel="noopener" title="${t('viewReceipt')}">📎 ${t('viewReceipt')}</a>` : `<span style="color:var(--text-muted)">${t('noReceipt')}</span>`}</td>
        <td style="font-size:12px">${p.notes || '—'}</td>
        ${can('customers', 'edit') ? `<td><button class="pay-row-btn pay-row-btn-del" data-del-ledger="${p._id}" title="${t('deletePayment')}">🗑️</button></td>` : ''}
      </tr>
    `).join('') : '';

    const summaryRow = `
      <div class="payment-summary">
        <span>${t('totalIn')}: <strong style="color:#2ecc71">${formatCurrency(summary.total_in)}</strong></span>
        <span>${t('totalOut')}: <strong style="color:#e74c3c">${formatCurrency(summary.total_out)}</strong></span>
        <span>${t('balance')}: <strong style="color:${summary.balance > 0 ? 'var(--gold)' : '#2ecc71'}">${formatCurrency(summary.balance)}</strong></span>
      </div>`;

    container.innerHTML = `
      ${summaryRow}
      ${payments.length ? `
      <table class="payment-history-table">
        <thead><tr>
          <th>${t('date')}</th><th>${t('directionBadge')}</th><th>${t('amount')}</th>
          <th>${t('methodLabel')}</th><th>${t('receiptLabel')}</th><th>${t('notes')}</th>
          ${can('customers', 'edit') ? `<th>${t('actions') || 'Actions'}</th>` : ''}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<p style="color:var(--text-muted);padding:8px 0">${t('noPayments')}</p>`}`;

    container.querySelectorAll('[data-del-ledger]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('confirmDeletePayment'))) return;
        const result = await apiFetch(`/payments/${btn.dataset.delLedger}`, { method: 'DELETE' });
        if (result) {
          showToast(t('paymentDeleted'), 'success');
          renderPaymentLedger(customerId);
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:12px 0">${t('noPayments')}</p>`;
  }
}

let searchTimeout = null;

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
}

function applyFilters() {
  const query = document.getElementById('searchInput')?.value?.trim().toLowerCase() || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const programFilter = document.getElementById('filterProgram')?.value || '';
  const employeeFilter = document.getElementById('filterEmployee')?.value || '';
  const countryFilter = document.getElementById('filterCountry')?.value || '';
  const debtFilter = document.getElementById('filterDebt')?.value || '';

  let filtered = allCustomers;

  if (query) {
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.name_ar && c.name_ar.toLowerCase().includes(query)) ||
      (c.name_en && c.name_en.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(query)) ||
      (c.whatsapp_number && c.whatsapp_number.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }

  if (statusFilter) {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  if (programFilter) {
    filtered = filtered.filter(c => c.program === programFilter);
  }

  if (employeeFilter) {
    filtered = filtered.filter(c => c.assignedEmployee?._id === employeeFilter);
  }

  if (countryFilter) {
    filtered = filtered.filter(c => c.country === countryFilter);
  }

  if (debtFilter === 'hasDebt') {
    filtered = filtered.filter(c => (c.debt_balance || 0) > 0);
  } else if (debtFilter === 'noDebt') {
    filtered = filtered.filter(c => (c.debt_balance || 0) <= 0);
  } else if (debtFilter === 'paidInFull') {
    filtered = filtered.filter(c => (c.payment?.status === 'fullyPaid' || ((c.debt_balance || 0) === 0 && c.payment?.paidAmount > 0)));
  }

  renderCustomers(filtered);
}

function populateFilterDropdowns() {
  const employeeSelect = document.getElementById('filterEmployee');
  const programSelect = document.getElementById('filterProgram');
  const countrySelect = document.getElementById('filterCountry');
  if (!employeeSelect || !programSelect) return;

  loadEmployees().then(employees => {
    if (!employees) return;
    const currentValue = employeeSelect.value;
    employeeSelect.innerHTML = `<option value="">${t('allEmployees')}</option>`;
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp._id;
      opt.textContent = emp.name;
      employeeSelect.appendChild(opt);
    });
    employeeSelect.value = currentValue;
  });

  const programs = [...new Set(allCustomers.map(c => c.program).filter(Boolean))];
  const currentProgram = programSelect.value;
  programSelect.innerHTML = `<option value="">${t('allPrograms')}</option>`;
  programs.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    programSelect.appendChild(opt);
  });
  programSelect.value = currentProgram;

  if (countrySelect) {
    const currentCountry = countrySelect.value;
    countrySelect.innerHTML = `<option value="">${t('allCountries')}</option>`;
    COUNTRY_KEYS.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${COUNTRIES[key].flag} ${countryDisplayName(key, currentLang)}`;
      countrySelect.appendChild(opt);
    });
    countrySelect.value = currentCountry;
  }
}

function hideCustomerDetails() {
  currentView = 'list';
  currentCustomerId = null;
  const grid = document.getElementById('customersGrid');
  const empty = document.getElementById('customersEmpty');
  const details = document.getElementById('customerDetails');
  const toolbar = document.querySelector('.customers-toolbar');
  const filters = document.getElementById('filtersBar');

  if (details) details.style.display = 'none';
  if (grid) grid.style.display = '';
  if (toolbar) toolbar.style.display = '';
  if (filters) filters.style.display = '';

  const customers = allCustomers;
  if (customers.length === 0) {
    if (empty) empty.classList.add('show');
  } else {
    if (empty) empty.classList.remove('show');
  }
}

// ---- Payment Form Helpers ----
function updateFormPaymentCalcs() {
  const total = parseFloat(document.getElementById('formPayTotal')?.value) || 0;
  const paid = parseFloat(document.getElementById('formPayPaid')?.value) || 0;
  const remaining = Math.max(0, total - paid);
  const cur = document.getElementById('formPayCurrency')?.value || 'EGP';
  document.getElementById('formPayRemaining').textContent = formatCurrency(remaining, cur);
  const statusEl = document.getElementById('formPayStatusDisplay');
  if (total === 0) {
    statusEl.textContent = '—';
    statusEl.style.color = 'var(--text-muted)';
  } else if (paid >= total) {
    statusEl.textContent = '🟢 ' + t('fullyPaid');
    statusEl.style.color = 'var(--success)';
  } else if (paid > 0) {
    statusEl.textContent = '🟡 ' + t('partiallyPaid');
    statusEl.style.color = 'var(--warning)';
  } else {
    statusEl.textContent = '🔴 ' + t('notPaid');
    statusEl.style.color = 'var(--danger)';
  }
}

async function populateProgramDatalist() {
  const dl = document.getElementById('programList');
  if (!dl) return;
  try {
    const data = await apiFetch('/programs');
    const programs = data?.programs || [];
    programPriceMap = {};
    dl.innerHTML = '';
    programs.forEach(p => {
      programPriceMap[p.name] = { price: p.price, currency: p.currency || 'EGP', prices: p.prices || {} };
      const opt = document.createElement('option');
      opt.value = p.name;
      dl.appendChild(opt);
    });
  } catch {
    programPriceMap = {};
  }
}

function applyProgramPriceAutoFill() {
  const programEl = document.getElementById('formProgram');
  const name = programEl?.value?.trim();
  if (!name || !programPriceMap[name]) return;
  const info = programPriceMap[name];
  const cur = document.getElementById('formPayCurrency')?.value || 'EGP';
  const price = info.prices && info.prices[cur] !== undefined ? info.prices[cur] : info.price;
  const ppEl = document.getElementById('formPayProgramPrice');
  const discEl = document.getElementById('formPayDiscount');
  const totalEl = document.getElementById('formPayTotal');
  if (ppEl) ppEl.value = price;
  const disc = parseFloat(discEl?.value) || 0;
  if (totalEl) totalEl.value = Math.max(0, price - disc);
  updateFormPaymentCalcs();
}

function setupCurrencyAutoFill() {
  const curSel = document.getElementById('formPayCurrency');
  if (!curSel) return;
  curSel.removeEventListener('change', applyProgramPriceAutoFill);
  curSel.addEventListener('change', applyProgramPriceAutoFill);
}

function setupProgramAutoFill() {
  const programEl = document.getElementById('formProgram');
  if (!programEl) return;
  programEl.removeEventListener('change', applyProgramPriceAutoFill);
  programEl.addEventListener('change', applyProgramPriceAutoFill);
}

function setupFormPaymentToggle() {
  const statusSelect = document.getElementById('formStatus');
  const paySection = document.getElementById('formPaymentSection');
  const payTotal = document.getElementById('formPayTotal');
  const payPaid = document.getElementById('formPayPaid');
  const payProgramPrice = document.getElementById('formPayProgramPrice');
  const payDiscount = document.getElementById('formPayDiscount');
  const payInitial = document.getElementById('formPayInitial');
  const handler = function () {
    paySection.style.display = this.value === 'subscribed' ? '' : 'none';
  };
  statusSelect.removeEventListener('change', handler);
  statusSelect.addEventListener('change', handler);
  if (statusSelect.value === 'subscribed') {
    paySection.style.display = '';
  }
  const deriveTotal = function () {
    const pp = parseFloat(payProgramPrice?.value) || 0;
    const disc = parseFloat(payDiscount?.value) || 0;
    if (payTotal) payTotal.value = Math.max(0, pp - disc);
    updateFormPaymentCalcs();
  };
  [payProgramPrice, payDiscount].forEach(el => {
    if (!el) return;
    el.removeEventListener('input', deriveTotal);
    el.addEventListener('input', deriveTotal);
  });
  [payTotal, payPaid, payInitial].forEach(el => {
    if (!el) return;
    el.removeEventListener('input', updateFormPaymentCalcs);
    el.addEventListener('input', updateFormPaymentCalcs);
  });
}

// ---- Country auto-detection ----
let countryDetectionListenerBound = false;

function updateCountryDetectHint(country) {
  const hint = document.getElementById('countryDetectHint');
  if (!hint) return;
  const info = COUNTRIES[country] || COUNTRIES.other;
  hint.innerHTML = `${info.flag} ${t('countryAutoDetected')}: ${countryDisplayName(country, currentLang)}`;
  hint.className = 'country-detect-hint detect-auto';
  hint.style.display = '';
}

function setupCountryAutoDetect() {
  const phoneEl = document.getElementById('formPhone');
  const waEl = document.getElementById('formWhatsapp');
  const countryEl = document.getElementById('formCountry');
  if (!phoneEl || !waEl || !countryEl) return;

  const apply = () => {
    if (countryEl.value) {
      const hint = document.getElementById('countryDetectHint');
      if (hint) hint.style.display = 'none';
      return;
    }
    const value = waEl.value || phoneEl.value;
    if (!value) return;
    const country = detectCountryFromPhone(value);
    if (country !== 'other') {
      countryEl.value = country;
      updateCountryDetectHint(country);
    } else {
      const hint = document.getElementById('countryDetectHint');
      if (hint) {
        hint.innerHTML = `${COUNTRIES.other.flag} ${t('countryAutoDetected')}: ${countryDisplayName('other', currentLang)}`;
        hint.className = 'country-detect-hint detect-auto';
        hint.style.display = '';
      }
    }
  };

  phoneEl.removeEventListener('input', apply);
  waEl.removeEventListener('input', apply);
  phoneEl.addEventListener('input', apply);
  waEl.addEventListener('input', apply);

  if (!countryDetectionListenerBound) {
    countryEl.addEventListener('change', function () {
      const hint = document.getElementById('countryDetectHint');
      if (this.value) {
        if (hint) hint.style.display = 'none';
      }
    });
    countryDetectionListenerBound = true;
  }
}

// ---- Modal logic ----
function openAddModal() {
  editingCustomerId = null;
  document.getElementById('customerForm').reset();
  document.getElementById('modalTitle').textContent = t('addCustomer');
  document.getElementById('formSubmit').textContent = t('save');
  document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('formPaymentSection').style.display = 'none';
  document.getElementById('formPayProgramPrice').value = '';
  document.getElementById('formPayDiscount').value = '';
  document.getElementById('formPayTotal').value = '';
  document.getElementById('formPayInitial').value = '';
  document.getElementById('formPayPaid').value = '';
  const curSel = document.getElementById('formPayCurrency');
  if (curSel) curSel.value = 'EGP';
  document.getElementById('formPayRemaining').textContent = formatCurrency(0, curSel ? curSel.value : 'EGP');
  document.getElementById('formCountry').value = '';
  const hint = document.getElementById('countryDetectHint');
  if (hint) hint.style.display = 'none';
  const stEl = document.getElementById('formPayStatusDisplay');
  stEl.textContent = '—'; stEl.style.color = 'var(--text-muted)';
  document.getElementById('customerModal').classList.add('show');
  document.body.classList.add('modal-open');
  populateModalEmployees();
  populateCampaignSelect();
  setupFormPaymentToggle();
  populateProgramDatalist();
  setupProgramAutoFill();
  setupCurrencyAutoFill();
  setupCountryAutoDetect();
}

async function openEditModal(customerId) {
  const local = allCustomers.find(c => c._id === customerId);
  let customer = local;
  const fresh = await apiFetch(`/customers/${customerId}`);
  if (fresh && fresh.customer) {
    customer = fresh.customer;
    const idx = allCustomers.findIndex(c => c._id === customerId);
    if (idx !== -1) allCustomers[idx] = customer;
  }
  if (!customer) return;
  editingCustomerId = customerId;
  document.getElementById('modalTitle').textContent = t('editCustomer');
  document.getElementById('formSubmit').textContent = t('save');
  document.getElementById('formName').value = customer.name || '';
  document.getElementById('formNameAr').value = customer.name_ar || '';
  document.getElementById('formNameEn').value = customer.name_en || '';
  document.getElementById('formPhone').value = customer.phone || '';
  document.getElementById('formWhatsapp').value = customer.whatsapp || '';
  document.getElementById('formCountry').value = customer.country || '';
  document.getElementById('formEmail').value = customer.email || '';
  document.getElementById('formAddress').value = customer.address || '';
  document.getElementById('formProgram').value = customer.program || '';
  document.getElementById('formDate').value = customer.registrationDate ? customer.registrationDate.split('T')[0] : '';
  document.getElementById('formStatus').value = customer.status || 'potential';
  document.getElementById('formNotes').value = customer.notes || '';
  const isSubscribed = customer.status === 'subscribed';
  const pay = customer.payment || {};
  document.getElementById('formPayProgramPrice').value = pay.programPrice ?? pay.totalAmount ?? '';
  document.getElementById('formPayDiscount').value = pay.discount || '';
  document.getElementById('formPayTotal').value = pay.finalPrice || '';
  document.getElementById('formPayInitial').value = pay.initialPayment || '';
  document.getElementById('formPayPaid').value = pay.paidAmount || '';
  const curSel = document.getElementById('formPayCurrency');
  if (curSel) curSel.value = pay.currency || currencyForCountry(customer.country || 'other');
  updateFormPaymentCalcs();
  document.getElementById('formPaymentSection').style.display = isSubscribed ? '' : 'none';
  document.getElementById('customerModal').classList.add('show');
  document.body.classList.add('modal-open');
  populateModalEmployees(customer.assignedEmployee?._id || '');
  populateCampaignSelect(customer.campaign?._id || customer.campaign || '');
  setupFormPaymentToggle();
  populateProgramDatalist();
  setupProgramAutoFill();
  setupCurrencyAutoFill();
  setupCountryAutoDetect();
}

function closeModal() {
  document.getElementById('customerModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  editingCustomerId = null;
}

async function populateModalEmployees(selectedId) {
  const select = document.getElementById('formEmployee');
  const employees = await loadEmployees();
  if (!employees) return;
  select.innerHTML = `<option value="">${t('none')}</option>`;
  employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp._id;
    opt.textContent = emp.name;
    if (selectedId && emp._id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

async function populateCampaignSelect(selectedId) {
  const select = document.getElementById('formCampaign');
  if (!select) return;
  const data = await apiFetch('/campaigns');
  if (!data) return;
  select.innerHTML = `<option value="">${t('none')}</option>`;
  (data.campaigns || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c._id;
    opt.textContent = c.name;
    if (selectedId && c._id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('formSubmit');
  if (!submitBtn) return;
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const status = document.getElementById('formStatus')?.value || 'potential';
    const body = {
      name: (document.getElementById('formName')?.value || '').trim(),
      name_ar: (document.getElementById('formNameAr')?.value || '').trim(),
      name_en: (document.getElementById('formNameEn')?.value || '').trim(),
      phone: (document.getElementById('formPhone')?.value || '').trim(),
      whatsapp: (document.getElementById('formWhatsapp')?.value || '').trim(),
      country: document.getElementById('formCountry')?.value || '',
      email: (document.getElementById('formEmail')?.value || '').trim(),
      address: (document.getElementById('formAddress')?.value || '').trim(),
      program: (document.getElementById('formProgram')?.value || '').trim(),
      campaign: document.getElementById('formCampaign')?.value || null,
      assignedEmployee: document.getElementById('formEmployee')?.value || null,
      registrationDate: document.getElementById('formDate')?.value || null,
      status: status,
      notes: (document.getElementById('formNotes')?.value || '').trim()
    };

    if (status === 'subscribed') {
      const pp = parseFloat(document.getElementById('formPayProgramPrice')?.value) || 0;
      const disc = parseFloat(document.getElementById('formPayDiscount')?.value) || 0;
      const fp = Math.max(0, pp - disc);
      const ip = parseFloat(document.getElementById('formPayInitial')?.value) || 0;
      const total = parseFloat(document.getElementById('formPayTotal')?.value) || 0;
      const paid = parseFloat(document.getElementById('formPayPaid')?.value) || 0;
      const finalPrice = total > 0 ? total : fp;
      body.payment = {
        programPrice: pp,
        discount: disc,
        finalPrice: finalPrice,
        initialPayment: ip,
        paidAmount: Math.max(paid, ip),
        remainingAmount: Math.max(0, finalPrice - Math.max(paid, ip)),
        currency: document.getElementById('formPayCurrency')?.value || 'EGP'
      };
    }

    if (!body.phone && !body.whatsapp) {
      const el = document.getElementById('formPhone');
      if (el) el.style.borderColor = 'var(--danger)';
      showToast(t('whatsappRequired'), 'error');
      submitBtn.disabled = false; submitBtn.classList.remove('loading'); submitBtn.textContent = t('save');
      return;
    }

    if (!body.country) {
      body.country = detectCountryFromPhone(body.whatsapp || body.phone || '');
    }

    const isEdit = !!editingCustomerId;
    const url = isEdit ? `/customers/${editingCustomerId}` : '/customers';
    const method = isEdit ? 'PUT' : 'POST';
    const result = await apiFetch(url, { method, body: JSON.stringify(body) });

    if (result && result.customer) {
      closeModal();
      showToast(isEdit ? t('customerUpdated') : t('customerCreated'), 'success');
      if (isEdit) {
        const idx = allCustomers.findIndex(c => c._id === result.customer._id);
        if (idx !== -1) allCustomers[idx] = result.customer;
      } else {
        allCustomers.unshift(result.customer);
      }
      renderStats();
      populateFilterDropdowns();
      applyFilters();
      if (isEdit && returnToDetailsAfterEdit) {
        const detailsId = returnToDetailsAfterEdit;
        returnToDetailsAfterEdit = null;
        showCustomerDetails(detailsId);
      }
    }
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = t('save');
  }
}

function openDeleteModal(customerId) {
  if (!can('customers', 'delete')) return;
  const customer = allCustomers.find(c => c._id === customerId);
  if (!customer) return;
  deleteCustomerId = customerId;
  document.getElementById('deleteCustomerName').textContent = customer.name;
  document.getElementById('deleteModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  deleteCustomerId = null;
}

async function confirmDelete() {
  if (!deleteCustomerId) return;
  const result = await apiFetch(`/customers/${deleteCustomerId}`, { method: 'DELETE' });
  if (result) {
    closeDeleteModal();
    showToast(t('customerDeleted'), 'success');
    allCustomers = allCustomers.filter(c => c._id !== deleteCustomerId);
    deleteCustomerId = null;
    renderStats();
    populateFilterDropdowns();
    applyFilters();
  }
}

// ---- Payment Modal (compact ledger) ----
let paymentCustomerId = null;
let paymentMethodsCache = null;

async function loadPaymentMethods(country) {
  if (!paymentMethodsCache) {
    const data = await apiFetch(`/payment-methods`);
    paymentMethodsCache = data?.methods || [];
  }
  const code = country || 'other';
  return paymentMethodsCache.filter(m =>
    (m.country === code || m.country === 'global') && m.is_active !== false
  );
}

function openAddPaymentModal(customer) {
  paymentCustomerId = customer._id;
  document.getElementById('payModalTitle').textContent = t('recordPayment') + ' - ' + customer.name;
  document.getElementById('payFormSubmit').textContent = t('save');
  document.getElementById('payFormAmount').value = '';
  document.getElementById('payFormNotes').value = '';
  document.getElementById('payFormReceipt').value = '';
  document.getElementById('payFormCurrency').value = customer.payment?.currency || currencyForCountry(customer.country || 'other');

  const avatar = document.getElementById('payCustomerAvatar');
  if (avatar) avatar.textContent = (customer.name || '?').trim().charAt(0).toUpperCase();
  const nameEl = document.getElementById('payCustomerName');
  if (nameEl) nameEl.textContent = customer.name || '\u2014';
  const metaEl = document.getElementById('payCustomerMeta');
  if (metaEl) metaEl.textContent = (customer.phone || customer.whatsapp || '\u2014') + (customer.program ? ' \u00b7 ' + customer.program : '');
  const stEl = document.getElementById('payCustomerStatus');
  if (stEl) {
    const st = customer.status || 'potential';
    stEl.className = 'customer-status-badge ' + st;
    let subIcon = '\uD83D\uDFE2';
    if (st === 'potential') subIcon = '\u2B50';
    else if (st !== 'subscribed') subIcon = '\uD83D\uDD34';
    stEl.textContent = subIcon + ' ' + t(st);
  }

  const methodSel = document.getElementById('payFormMethod');
  methodSel.innerHTML = '<option value="">--</option>';
  loadPaymentMethods(customer.country || 'other').then(methods => {
    methods.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m._id;
      opt.textContent = m.name;
      methodSel.appendChild(opt);
    });
  });

  document.getElementById('paymentModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('payFormAmount').focus(), 120);
}

function closePayModal() {
  document.getElementById('paymentModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  paymentCustomerId = null;
}

async function handleAddPaymentSubmit(e) {
  e.preventDefault();
  if (!paymentCustomerId) return;
  const btn = document.getElementById('payFormSubmit');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const amount = parseFloat(document.getElementById('payFormAmount')?.value) || 0;
    if (amount <= 0) {
      showToast(t('invalidAmount'), 'error');
      btn.disabled = false; btn.classList.remove('loading');
      btn.textContent = t('save');
      return;
    }

    const direction = 'in';
    const fileInput = document.getElementById('payFormReceipt');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) {
        showToast(t('invalidReceipt'), 'error');
        btn.disabled = false; btn.classList.remove('loading');
        btn.textContent = t('save');
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        showToast(t('invalidReceipt'), 'error');
        btn.disabled = false; btn.classList.remove('loading');
        btn.textContent = t('save');
        return;
      }
    }

    const fd = new FormData();
    fd.append('amount', amount);
    fd.append('direction', direction);
    fd.append('currency', document.getElementById('payFormCurrency')?.value || 'EGP');
    const methodId = document.getElementById('payFormMethod')?.value;
    if (methodId) fd.append('method_id', methodId);
    fd.append('notes', (document.getElementById('payFormNotes')?.value || '').trim());
    if (fileInput && fileInput.files && fileInput.files[0]) fd.append('receipt', fileInput.files[0]);

    const token = getToken();
    const res = await fetch(`${API_URL}/customers/${paymentCustomerId}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'save failed');

    const cid = paymentCustomerId;
    closePayModal();
    showToast(t('paymentAdded'), 'success');
    const refreshed = await apiFetch(`/customers/${cid}`);
    if (refreshed && refreshed.customer) {
      const idx = allCustomers.findIndex(c => c._id === cid);
      if (idx !== -1) allCustomers[idx] = refreshed.customer;
      renderStats();
      if (currentView === 'details' && currentCustomerId === cid) {
        populateDetails(refreshed.customer);
        renderPaymentLedger(cid);
      } else {
        applyFilters();
      }
    } else {
      applyFilters();
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = t('save');
  }
}

// ---- Communications & Messages (Task 4) ----
let commTypesCache = null;

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function loadCommTypes() {
  if (commTypesCache) return commTypesCache;
  try {
    const data = await apiFetch('/communication-types');
    commTypesCache = (data && data.types) || [];
  } catch { commTypesCache = []; }
  return commTypesCache;
}

async function incrementCommunication(cid) {
  try {
    const data = await apiFetch(`/customers/${cid}/increment-communication`, { method: 'POST' });
    const count = data && data.customer && data.customer.communication_count;
    const chip = document.querySelector(`[data-comm="${cid}"] .comm-count-num`);
    if (chip && count !== undefined) {
      chip.textContent = count;
      const chipWrap = chip.closest('.comm-count-chip');
      if (chipWrap) {
        chipWrap.classList.remove('bump');
        void chipWrap.offsetWidth;
        chipWrap.classList.add('bump');
      }
    }
    if (count !== undefined && document.getElementById('commStats')) {
      loadCommStats(cid);
    }
  } catch (e) {
    showToast(t('failed'), 'error');
  }
}

function loadCardMessageSliders(customers) {
  const targets = [];
  customers.forEach(c => {
    const el = document.querySelector(`.card-msg-slider[data-msg-cid="${c._id}"]`);
    if (el) targets.push({ id: c._id, el });
  });
  targets.forEach(item => {
    apiFetch(`/customers/${item.id}/messages/latest`).then(data => {
      if (!data) return;
      const cMsg = data.customer;
      const eMsg = data.employee;
      if (!cMsg && !eMsg) return;
      const inner = item.el.querySelector('.msg-slider-inner');
      if (!inner) return;
      let html = '';
      if (cMsg) html += `<div class="msg-slider-item customer"><span class="msg-slider-label">${t('customerLast')}:</span> <span class="msg-slider-text">${escapeHtml(truncateMsg(cMsg.content, 50))}</span></div>`;
      if (eMsg) html += `<div class="msg-slider-item employee"><span class="msg-slider-label">${t('employeeLast')}:</span> <span class="msg-slider-text">${escapeHtml(truncateMsg(eMsg.content, 50))}</span></div>`;
      inner.innerHTML = html;
    }).catch(() => {});
  });
}

function truncateMsg(text, max) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

function loadCommunicationSection(customer) {
  const box = document.getElementById('commLogBox');
  if (!box) return;
  loadCommTypes().then(types => {
    const select = document.getElementById('commTypeFilter');
    if (select && types.length) {
      select.innerHTML = `<option value="">${t('allTypes')}</option>` + types.map(ty => `<option value="${ty._id}">${escapeHtml(ty.icon)} ${escapeHtml(ty.name)}</option>`).join('');
    }
  });
  loadCommStats(customer._id);
  loadCommList(customer._id, box, '');
}

async function loadCommStats(cid) {
  try {
    const data = await apiFetch(`/customers/${cid}/communications/stats`);
    if (!data) return;
    const el = document.getElementById('commStats');
    if (!el) return;
    let breakdown = '';
    if (data.breakdown && data.breakdown.length) {
      breakdown = data.breakdown.map(b => `<span class="comm-stat-type">${escapeHtml(b.icon) || '💬'} ${escapeHtml(b.name)}: ${b.count}</span>`).join('');
    } else {
      breakdown = '<span style="color:var(--text-muted)">—</span>';
    }
    el.innerHTML = `
      <div class="comm-stat-row"><span>${t('totalCommunications')}:</span><strong>${data.total || 0}</strong></div>
      <div class="comm-stat-row"><span>${t('lastCommunication')}:</span><strong>${formatDateTime(data.last_date)}</strong></div>
      <div class="comm-stat-breakdown">${breakdown}</div>
    `;
  } catch {}
}

async function loadCommList(cid, box, typeFilter) {
  try {
    const qs = typeFilter ? `?type=${typeFilter}` : '';
    const data = await apiFetch(`/customers/${cid}/communications${qs}`);
    const list = (data && data.communications) || [];
    if (!list.length) {
      box.innerHTML = `<p style="color:var(--text-muted);padding:8px 0">${t('noCommunications')}</p>`;
      return;
    }
    box.innerHTML = list.map(com => `
      <div class="comm-log-row">
        <span class="comm-log-icon">${escapeHtml(com.typeIcon) || '💬'}</span>
        <span class="comm-log-type">${escapeHtml(com.typeName) || '—'}</span>
        <span class="comm-log-date">${formatDateTime(com.communication_date)}</span>
        <span class="comm-log-notes">${escapeHtml(com.notes) || '—'}</span>
        <span class="comm-log-by">${com.created_by ? escapeHtml(com.created_by.name || com.created_by.email || '') : '—'}</span>
      </div>
    `).join('');
  } catch (e) {
    box.innerHTML = `<p style="color:var(--text-muted);padding:8px 0">${t('noCommunications')}</p>`;
  }
}

let commCustomerId = null;
let msgCustomerId = null;
let msgPage = 1;
let msgTotalPages = 1;

function openAddCommunicationModal(customerId) {
  commCustomerId = customerId;
  document.getElementById('commModalTitle').textContent = t('addCommunication');
  document.getElementById('commFormType').innerHTML = '<option value="">—</option>';
  document.getElementById('commFormDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('commFormNotes').value = '';
  loadCommTypes().then(types => {
    const select = document.getElementById('commFormType');
    select.innerHTML = '<option value="">—</option>' + types.map(ty => `<option value="${ty._id}">${escapeHtml(ty.icon)} ${escapeHtml(ty.name)}</option>`).join('');
  });
  document.getElementById('commModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeCommModal() {
  document.getElementById('commModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  commCustomerId = null;
}

async function handleAddCommunicationSubmit(e) {
  e.preventDefault();
  if (!commCustomerId) return;
  const type_id = document.getElementById('commFormType')?.value || '';
  const communication_date = document.getElementById('commFormDate')?.value || new Date().toISOString().split('T')[0];
  const notes = (document.getElementById('commFormNotes')?.value || '').trim();
  const btn = document.getElementById('commFormSubmit');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const data = await apiFetch(`/customers/${commCustomerId}/communications`, {
      method: 'POST',
      body: JSON.stringify({ type_id: type_id || undefined, communication_date, notes })
    });
    if (!data) throw new Error();
    showToast(t('saved'), 'success');
    const cid = commCustomerId;
    closeCommModal();
    loadCommStats(cid);
    loadCommList(cid, document.getElementById('commLogBox'), document.getElementById('commTypeFilter')?.value || '');
    const chip = document.querySelector(`[data-comm="${cid}"] .comm-count-num`);
    if (chip) chip.textContent = Number(chip.textContent || 0) + 1;
  } catch (err) {
    showToast(t('failed'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function loadMessageSection(customer) {
  msgCustomerId = customer._id;
  msgPage = 1;
  msgTotalPages = 1;
  loadMessageList(customer._id, 1, true);
}

async function loadMessageList(cid, page, replace) {
  const chat = document.getElementById('msgChatBox');
  if (!chat) return;
  try {
    const data = await apiFetch(`/customers/${cid}/messages?page=${page}`);
    const list = (data && data.messages) || [];
    msgTotalPages = (data && data.pages) || 1;
    const html = list.map(m => {
      const isCustomer = m.sender_type === 'customer';
      return `<div class="msg-bubble ${isCustomer ? 'customer' : 'employee'}">
        <div class="msg-bubble-text">${escapeHtml(m.content)}</div>
        <div class="msg-bubble-meta">${isCustomer ? t('senderCustomer') : t('senderEmployee')} · ${formatDateTime(m.created_at)}</div>
      </div>`;
    }).join('');
    if (replace) {
      chat.innerHTML = html || `<p style="color:var(--text-muted);padding:12px 0;text-align:center">${t('noMessages')}</p>`;
    } else {
      chat.innerHTML += html;
    }
    chat.scrollTop = chat.scrollHeight;
    const loadMore = document.getElementById('msgLoadMoreBtn');
    if (loadMore) loadMore.style.display = (msgPage < msgTotalPages) ? '' : 'none';
  } catch (e) {
    chat.innerHTML = `<p style="color:var(--text-muted);padding:12px 0;text-align:center">${t('noMessages')}</p>`;
  }
}

function openAddMessageModal(customerId) {
  msgCustomerId = customerId;
  document.getElementById('msgModalTitle').textContent = t('addMessage');
  document.getElementById('msgFormContent').value = '';
  document.querySelector('input[name="msg-sender"]:checked')?.removeAttribute('checked');
  const customerRadio = document.getElementById('msgSenderCustomer');
  if (customerRadio) customerRadio.checked = true;
  document.getElementById('msgModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('msgFormContent').focus(), 100);
}

function closeMsgModal() {
  document.getElementById('msgModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  msgCustomerId = null;
}

async function handleAddMessageSubmit(e) {
  e.preventDefault();
  if (!msgCustomerId) return;
  const content = (document.getElementById('msgFormContent')?.value || '').trim();
  if (!content) return;
  const sender_type = document.querySelector('input[name="msg-sender"]:checked')?.value || 'employee';
  const btn = document.getElementById('msgFormSubmit');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const data = await apiFetch(`/customers/${msgCustomerId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ sender_type, content })
    });
    if (!data || !data.message) throw new Error();
    showToast(t('messageAdded'), 'success');
    const cid = msgCustomerId;
    closeMsgModal();
    loadMessageList(cid, 1, true);
    const slider = document.querySelector(`.card-msg-slider[data-msg-cid="${cid}"]`);
    if (slider) loadCardMessageSliders([{ _id: cid }]);
  } catch (err) {
    showToast(t('messageFailed'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ---- Customer Status (Task 5) ----
let statusCache = null;
let statusHistoryPage = 1;
let statusHistoryPages = 0;

function statusColorFor(c) {
  return (c.status_id && c.status_id.color) || '#6B7280';
}

function statusNameFor(c) {
  const name = (c.status_id && c.status_id.name) || '';
  const key = name.toLowerCase().replace(/\s+/g, '');
  const mapped = { new: 'new', contacted: 'contacted', transferredtophone: 'transferredToPhone', interested: 'interested', notinterested: 'notInterested', subscribed: 'subscribed', cancelled: 'cancelled' };
  if (mapped[key]) return t(mapped[key]);
  return name || t('new');
}

function statusTextColor(hex) {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex || '');
  if (!m) return '#fff';
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#111827' : '#fff';
}

function statusBadgeHtml(c, opts) {
  const size = opts && opts.size ? opts.size : 'sm';
  const color = statusColorFor(c);
  const txt = statusTextColor(color);
  const name = statusNameFor(c);
  const desc = (c.status_id && c.status_id.description) || '';
  const statusId = c.status_id ? c.status_id._id : '';
  const cid = c._id;
  return `<span class="cs-badge cs-badge-${size}" data-cs-badge="${cid}" data-cs-status="${statusId}" style="background:${color};color:${txt}" title="${escapeHtml(desc)}"><span class="cs-badge-dot"></span>${escapeHtml(name)} ${can('customers', 'edit') ? '▾' : ''}</span>`;
}

async function loadStatusOptions() {
  if (statusCache) return statusCache;
  const data = await apiFetch('/customer-statuses');
  statusCache = (data && data.statuses) || [];
  return statusCache;
}

async function loadStatusHistory(customerId, page, append) {
  const box = document.getElementById('csHistoryBox');
  if (!box) return;
  try {
    const data = await apiFetch(`/customers/${customerId}/status-history?page=${page}&limit=10`);
    if (!data) return;
    statusHistoryPages = Math.ceil((data.total || 0) / 10);
    const rows = (data.history || []).map(h => {
      const toColor = (h.to_status && h.to_status.color) || '#6B7280';
      const toName = (h.to_status && h.to_status.name) || t('new');
      const fromName = h.from_status ? h.from_status.name : t('new');
      const fromColor = h.from_status ? h.from_status.color : '#6B7280';
      const by = h.changed_by_name || t('unknown');
      const when = formatDateTime(h.changed_at);
      const notes = h.notes ? `<div class="cs-history-note">📝 ${escapeHtml(h.notes)}</div>` : '';
      return `
        <div class="cs-history-item">
          <span class="cs-history-dot" style="background:${toColor}"></span>
          <div class="cs-history-body">
            <div class="cs-history-text">
              <span class="cs-mini-badge" style="background:${fromColor};color:${statusTextColor(fromColor)}">${escapeHtml(fromName)}</span>
              → 
              <span class="cs-mini-badge" style="background:${toColor};color:${statusTextColor(toColor)}">${escapeHtml(toName)}</span>
              <span class="cs-history-by">${t('by')} ${escapeHtml(by)}</span>
            </div>
            <div class="cs-history-date">${when}</div>
            ${notes}
          </div>
        </div>`;
    }).join('');
    if (append && box.dataset.mode === 'loaded') {
      box.insertAdjacentHTML('beforeend', rows);
    } else {
      box.innerHTML = rows || `<p style="color:var(--text-muted);padding:8px 0">${t('statusHistoryEmpty')}</p>`;
      box.dataset.mode = 'loaded';
    }
    const moreBtn = document.getElementById('csHistoryMoreBtn');
    if (moreBtn) moreBtn.style.display = (statusHistoryPage < statusHistoryPages) ? '' : 'none';
  } catch (e) {
    box.innerHTML = `<p style="color:var(--text-muted);padding:8px 0">${t('statusHistoryEmpty')}</p>`;
  }
}

async function openStatusDropdown(customerId, anchor) {
  const existing = document.querySelector('.cs-dropdown');
  if (existing) existing.remove();
  const statuses = await loadStatusOptions();
  const customer = allCustomers.find(c => c._id === customerId) || {};
  const currentId = (customer.status_id && customer.status_id._id) || '';
  const dd = document.createElement('div');
  dd.className = 'cs-dropdown';
  dd.innerHTML = statuses.map(s => `
    <div class="cs-dropdown-option ${String(s._id) === String(currentId) ? 'active' : ''}" data-cs-option="${s._id}">
      <span class="cs-badge-dot" style="background:${s.color}"></span>
      <span>${escapeHtml(s.name)}</span>
    </div>`).join('');
  document.body.appendChild(dd);
  const r = anchor.getBoundingClientRect();
  dd.style.top = `${r.bottom + window.scrollY + 4}px`;
  dd.style.left = `${r.left + window.scrollX}px`;
  dd.querySelectorAll('[data-cs-option]').forEach(opt => {
    opt.addEventListener('click', () => {
      const statusId = opt.dataset.csOption;
      dd.remove();
      updateCustomerStatus(customerId, statusId, '');
    });
  });
  const closeHandler = (e) => {
    if (!e.target.closest('.cs-dropdown') && !e.target.closest('[data-cs-badge]')) {
      dd.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

async function updateCustomerStatus(customerId, statusId, notes) {
  const data = await apiFetch(`/customers/${customerId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status_id: statusId, notes: notes || '' })
  });
  if (!data) { showToast(t('statusUpdateFailed'), 'error'); return false; }
  showToast(t('statusUpdated'), 'success');
  const idx = allCustomers.findIndex(c => c._id === customerId);
  if (idx !== -1) {
    const statuses = await loadStatusOptions();
    const st = statuses.find(s => String(s._id) === String(statusId));
    if (st) allCustomers[idx].status_id = st;
  }
  const badge = document.querySelector(`[data-cs-badge="${customerId}"]`);
  if (badge) {
    const updated = allCustomers[idx];
    if (updated) badge.outerHTML = statusBadgeHtml(updated);
  }
  const detailSel = document.getElementById('csStatusSelect');
  if (detailSel) {
    const selected = allCustomers[idx];
    detailSel.value = String(selected && selected.status_id ? selected.status_id._id : statusId);
  }
  if (document.getElementById('csHistoryBox')) {
    statusHistoryPage = 1;
    loadStatusHistory(customerId, 1, false);
  }
  return true;
}

// ---- Init ----
function initCustomers() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    redirectToLogin();
    return;
  }

  initI18n('customers', 'customers');
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
      const section = i18n[currentLang]?.customers || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${section.langSwitch || ''}`;
    }
  };

  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const section = i18n[currentLang]?.customers || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    if (theme === 'dark') {
      btn.innerHTML = `<span class="icon">☀️</span> ${section?.themeLight || 'Light'}`;
    } else {
      btn.innerHTML = `<span class="icon">🌙</span> ${section?.themeDark || 'Dark'}`;
    }
  };

  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

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

  // Permission-based UI hiding
  if (!can('customers', 'add')) {
    document.getElementById('addCustomerBtn').style.display = 'none';
  }

  // Search
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Filters
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterProgram').addEventListener('change', applyFilters);
  document.getElementById('filterEmployee').addEventListener('change', applyFilters);
  const countryFilterEl = document.getElementById('filterCountry');
  if (countryFilterEl) countryFilterEl.addEventListener('change', applyFilters);
  const debtFilterEl = document.getElementById('filterDebt');
  if (debtFilterEl) debtFilterEl.addEventListener('change', applyFilters);

  // Back to list
  document.getElementById('backToListBtn').addEventListener('click', hideCustomerDetails);

  // Add Customer button
  document.getElementById('addCustomerBtn').addEventListener('click', openAddModal);

  // Import button
  const importBtn = document.getElementById('importBtn');
  if (importBtn) importBtn.addEventListener('click', () => window.location.href = 'customers-import.html');

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('formCancel').addEventListener('click', closeModal);
  document.getElementById('customerModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // Form submit
  document.getElementById('customerForm').addEventListener('submit', handleFormSubmit);

  // Clear field validation styling on input
  document.getElementById('formName').addEventListener('input', function () { this.style.borderColor = ''; });
  document.getElementById('formPhone').addEventListener('input', function () { this.style.borderColor = ''; });

  // Delete modal
  document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancel').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirm').addEventListener('click', confirmDelete);
  document.getElementById('deleteModal').addEventListener('click', function (e) {
    if (e.target === this) closeDeleteModal();
  });

  // Retry button
  document.getElementById('retryBtn').addEventListener('click', loadCustomers);

  // Payment modal events
  document.getElementById('payForm').addEventListener('submit', handleAddPaymentSubmit);
  document.getElementById('payModalClose').addEventListener('click', closePayModal);
  document.getElementById('payFormCancel').addEventListener('click', closePayModal);
  document.getElementById('paymentModal').addEventListener('click', function (e) {
    if (e.target === this) closePayModal();
  });

  // Communication + message modal events (Task 4)
  const commModal = document.getElementById('commModal');
  if (commModal) {
    document.getElementById('commForm').addEventListener('submit', handleAddCommunicationSubmit);
    document.getElementById('commModalClose').addEventListener('click', closeCommModal);
    document.getElementById('commFormCancel').addEventListener('click', closeCommModal);
    commModal.addEventListener('click', function (e) { if (e.target === this) closeCommModal(); });
  }
  const msgModal = document.getElementById('msgModal');
  if (msgModal) {
    document.getElementById('msgForm').addEventListener('submit', handleAddMessageSubmit);
    document.getElementById('msgModalClose').addEventListener('click', closeMsgModal);
    document.getElementById('msgFormCancel').addEventListener('click', closeMsgModal);
    msgModal.addEventListener('click', function (e) { if (e.target === this) closeMsgModal(); });
  }

  // ESC key to close modals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('paymentModal').classList.contains('show')) {
        closePayModal(); return;
      }
      if (document.getElementById('commModal').classList.contains('show')) {
        closeCommModal(); return;
      }
      if (document.getElementById('msgModal').classList.contains('show')) {
        closeMsgModal(); return;
      }
      if (document.getElementById('customerModal').classList.contains('show')) {
        closeModal(); return;
      }
      if (document.getElementById('deleteModal').classList.contains('show')) {
        closeDeleteModal();
      }
    }
  });

  loadCustomers();
  fetchPrices();
}

document.addEventListener('DOMContentLoaded', initCustomers);
