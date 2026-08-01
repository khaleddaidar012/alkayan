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

function formatCurrency(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' EGP';
}

function priceDisplay(label, value, opts) {
  const o = opts || {};
  return `<div class="price-display ${o.size === 'lg' ? 'price-display-lg' : ''} ${o.color ? 'price-display-' + o.color : ''}">
    ${label ? `<div class="price-label">${label}</div>` : ''}
    <div class="price-value">${formatCurrency(value)}</div>
  </div>`;
}

function t(key) {
  const section = i18n[currentLang]?.customers || i18n[currentLang]?.nav || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
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
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', options);
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
    const initial = c.name.charAt(0).toUpperCase();
    const statusClass = c.status || 'potential';
    const statusKey = statusClass;
    const whatsapp = c.whatsapp || c.phone || '—';
    const waPhone = c.whatsapp || c.phone || '';
    const program = c.program || '—';
    const employeeName = c.assignedEmployee?.name || '—';
    const pay = c.payment || {};
    const ps = pay.status || 'notPaid';
    const total = pay.finalPrice || 0;
    const paid = pay.paidAmount || 0;
    const remaining = pay.remainingAmount || 0;

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
        <div class="card-pay-total">${priceDisplay(t('totalAmount'), total, { size: 'lg', color: 'default' })}</div>
        <div class="card-pay-row"><span>✅ ${t('paidAmount')}:</span><span class="card-pay-value green">${formatCurrency(paid)}</span></div>
        <div class="card-pay-row"><span>⏳ ${t('remainingAmount')}:</span><span class="card-pay-value ${remaining > 0 ? 'gold' : 'green'}">${formatCurrency(remaining)}</span></div>
        <div class="card-pay-footer">
          <span class="payment-badge ${ps}">${subIcon} ${subLabel}</span>
          ${statusClass === 'subscribed' && can('customers', 'edit') ? `<button class="btn btn-xs card-pay-btn" data-pay="${c._id}">➕ ${t('addPayment')}</button>` : ''}
        </div>
      </div>`;

    const waLink = waPhone ? `https://wa.me/${waPhone.replace(/[^0-9]/g, '')}` : '#';

    return `
      <div class="customer-card" data-id="${c._id}">
        <div class="customer-card-actions" ${!can('customers', 'edit') && !can('customers', 'delete') ? 'style="display:none"' : ''}>
          ${can('customers', 'edit') ? `<button class="card-action-btn card-edit-btn" data-edit="${c._id}" title="${t('edit')}">✏️</button>` : ''}
          ${can('customers', 'delete') ? `<button class="card-action-btn card-delete-btn" data-delete="${c._id}" title="${t('delete')}">🗑️</button>` : ''}
        </div>
        <div class="customer-card-top">
          <div class="customer-avatar">${initial}</div>
          <span class="customer-status-badge ${statusClass}">${subIcon} ${t(statusKey)}</span>
        </div>
        <div class="customer-card-name">${c.name}</div>
        <div style="padding:0 16px 8px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
          <span>${subIcon} ${subLabel}</span>
          <span>·</span>
          <span>${t('totalAmount')}: ${formatCurrency(total)}</span>
        </div>
        ${paySection}
        <div class="customer-card-details">
          <div class="customer-card-detail">
            <span class="detail-icon">💬</span>
            <span>${whatsapp}</span>
          </div>
          ${waPhone ? `<div class="customer-card-detail">
            <a href="${waLink}" target="_blank" rel="noopener" class="wa-btn" title="${t('whatsapp')}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:#25D366;color:#fff;font-size:11px;text-decoration:none">
              💬 ${t('whatsapp')}
            </a>
          </div>` : ''}
          <div class="customer-card-detail">
            <span class="detail-icon">📚</span>
            <span>${program}</span>
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
    if (payBtn) { e.stopPropagation(); const c = allCustomers.find(x => x._id === payBtn.dataset.pay); if (c) openAddPaymentModal(c); return; }
    if (editBtn) { e.stopPropagation(); openEditModal(editBtn.dataset.edit); return; }
    if (delBtn) { e.stopPropagation(); openDeleteModal(delBtn.dataset.delete); return; }
    if (card) showCustomerDetails(card.dataset.id);
  };
  grid.addEventListener('click', grid.__customersClickHandler);
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
  const history = pay.history || [];

  const formatPayDate = (d) => d ? new Date(d).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

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
        <span class="details-value">${customer.name}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('phone')}</span>
        <span class="details-value">${customer.phone}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('whatsapp')}</span>
        <span class="details-value">${whatsapp} ${waPhone ? `<a href="https://wa.me/${waPhone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;background:#25D366;color:#fff;font-size:11px;text-decoration:none;margin-inline-start:8px">💬 ${t('whatsapp')}</a>` : ''}</span>
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
      <div class="details-row">
        <span class="details-label">${t('totalAmount')}</span>
        <span class="details-value">${priceDisplay('', pay.finalPrice, { size: 'lg', color: 'gold' })}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('paidAmount')}</span>
        <span class="details-value" style="color:var(--success)">${formatCurrency(pay.paidAmount)}</span>
      </div>
      <div class="details-row">
        <span class="details-label">${t('remainingAmount')}</span>
        <span class="details-value" style="color:${(pay.remainingAmount || 0) > 0 ? 'var(--warning)' : 'var(--success)'}">${formatCurrency(pay.remainingAmount)}</span>
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
          <span class="details-value" id="payFinalPrice">${formatCurrency(pay.finalPrice)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">${t('initialPayment')}</span>
          <input type="number" id="payInitial" class="details-input" value="${pay.initialPayment || ''}" min="0" step="1">
        </div>
        <div class="details-row">
          <span class="details-label">${t('paidAmount')}</span>
          <span class="details-value" id="payPaidDisplay">${formatCurrency(pay.paidAmount)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">${t('remainingAmount')}</span>
          <span class="details-value" id="payRemaining">${formatCurrency(pay.remainingAmount)}</span>
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
                  <button class="pay-row-btn" data-editpay="${r._id}" title="${t('editPayment')}">✏️</button>
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

  // Edit / Delete payment record buttons
  document.querySelectorAll('[data-editpay]').forEach(btn => {
    btn.addEventListener('click', () => openEditPaymentModal(customer, btn.dataset.editpay));
  });
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

  let filtered = allCustomers;

  if (query) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(query)) ||
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

  renderCustomers(filtered);
}

function populateFilterDropdowns() {
  const employeeSelect = document.getElementById('filterEmployee');
  const programSelect = document.getElementById('filterProgram');
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
  document.getElementById('formPayRemaining').textContent = formatCurrency(remaining);
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
      programPriceMap[p.name] = p.price;
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
  if (!name || programPriceMap[name] === undefined) return;
  const price = programPriceMap[name];
  const ppEl = document.getElementById('formPayProgramPrice');
  const discEl = document.getElementById('formPayDiscount');
  const totalEl = document.getElementById('formPayTotal');
  if (ppEl) ppEl.value = price;
  const disc = parseFloat(discEl?.value) || 0;
  if (totalEl) totalEl.value = Math.max(0, price - disc);
  updateFormPaymentCalcs();
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
  document.getElementById('formPayRemaining').textContent = formatCurrency(0);
  const stEl = document.getElementById('formPayStatusDisplay');
  stEl.textContent = '—'; stEl.style.color = 'var(--text-muted)';
  document.getElementById('customerModal').classList.add('show');
  document.body.classList.add('modal-open');
  populateModalEmployees();
  populateCampaignSelect();
  setupFormPaymentToggle();
  populateProgramDatalist();
  setupProgramAutoFill();
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
  document.getElementById('formPhone').value = customer.phone || '';
  document.getElementById('formWhatsapp').value = customer.whatsapp || '';
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
  updateFormPaymentCalcs();
  document.getElementById('formPaymentSection').style.display = isSubscribed ? '' : 'none';
  document.getElementById('customerModal').classList.add('show');
  document.body.classList.add('modal-open');
  populateModalEmployees(customer.assignedEmployee?._id || '');
  populateCampaignSelect(customer.campaign?._id || customer.campaign || '');
  setupFormPaymentToggle();
  populateProgramDatalist();
  setupProgramAutoFill();
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
      phone: (document.getElementById('formPhone')?.value || '').trim(),
      whatsapp: (document.getElementById('formWhatsapp')?.value || '').trim(),
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
        remainingAmount: Math.max(0, finalPrice - Math.max(paid, ip))
      };
    }

    if (!body.name || !body.phone) {
      if (!body.name) { const el = document.getElementById('formName'); if (el) el.style.borderColor = 'var(--danger)'; }
      if (!body.phone) { const el = document.getElementById('formPhone'); if (el) el.style.borderColor = 'var(--danger)'; }
      showToast('Name and phone are required', 'error');
      submitBtn.disabled = false; submitBtn.classList.remove('loading'); submitBtn.textContent = t('save');
      return;
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

// ---- Payment Modal ----
let paymentCustomerId = null;
let editingPaymentId = null;

function openAddPaymentModal(customer) {
  editingPaymentId = null;
  paymentCustomerId = customer._id;
  document.getElementById('payModalTitle').textContent = t('addPayment') + ' - ' + customer.name;
  document.getElementById('payFormSubmit').textContent = t('addPayment');
  document.getElementById('payFormAmount').value = '';
  document.getElementById('payFormMethod').value = 'cash';
  document.getElementById('payFormReference').value = '';
  document.getElementById('payFormNotes').value = '';
  const dateInput = document.getElementById('payFormDate');
  if (dateInput) { dateInput.value = ''; dateInput.style.display = 'none'; }
  const now = new Date();
  document.getElementById('payFormDateDisplay').textContent = now.toLocaleString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('payFormRemaining').textContent = formatCurrency(customer.payment?.remainingAmount || 0);
  document.getElementById('paymentModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function openEditPaymentModal(customer, recordId) {
  const record = (customer.payment?.history || []).find(r => r._id === recordId);
  if (!record) return;
  editingPaymentId = recordId;
  paymentCustomerId = customer._id;
  document.getElementById('payModalTitle').textContent = t('editPayment') + ' - ' + customer.name;
  document.getElementById('payFormSubmit').textContent = t('save');
  document.getElementById('payFormAmount').value = record.amount || '';
  document.getElementById('payFormMethod').value = record.method || 'cash';
  document.getElementById('payFormReference').value = record.referenceNumber || '';
  document.getElementById('payFormNotes').value = record.notes || '';
  const dateInput = document.getElementById('payFormDate');
  if (dateInput) {
    if (record.date) {
      dateInput.value = new Date(record.date).toISOString().split('T')[0];
    } else {
      dateInput.value = '';
    }
    dateInput.style.display = '';
  }
  document.getElementById('payFormDateDisplay').textContent = record.date ? new Date(record.date).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  document.getElementById('payFormRemaining').textContent = formatCurrency(customer.payment?.remainingAmount || 0);
  document.getElementById('paymentModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closePayModal() {
  document.getElementById('paymentModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  paymentCustomerId = null;
  editingPaymentId = null;
}

async function handleAddPaymentSubmit(e) {
  e.preventDefault();
  if (!paymentCustomerId) return;
  const btn = document.getElementById('payFormSubmit');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const body = {
      amount: parseFloat(document.getElementById('payFormAmount')?.value) || 0,
      method: document.getElementById('payFormMethod')?.value || 'cash',
      referenceNumber: (document.getElementById('payFormReference')?.value || '').trim(),
      notes: (document.getElementById('payFormNotes')?.value || '').trim()
    };
    const dateInput = document.getElementById('payFormDate');
    if (dateInput && dateInput.value) body.date = dateInput.value;
    if (body.amount <= 0) {
      showToast(t('enterValidAmount'), 'error');
      btn.disabled = false; btn.classList.remove('loading');
      btn.textContent = editingPaymentId ? t('save') : t('addPayment');
      return;
    }
    const isEdit = !!editingPaymentId;
    const url = isEdit ? `/customers/${paymentCustomerId}/payments/${editingPaymentId}` : `/customers/${paymentCustomerId}/payments`;
    const result = await apiFetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    });
    if (result && result.customer) {
      const cid = result.customer._id;
      closePayModal();
      showToast(isEdit ? t('paymentUpdated') : t('paymentAdded'), 'success');
      const idx = allCustomers.findIndex(c => c._id === cid);
      if (idx !== -1) allCustomers[idx] = result.customer;
      renderStats();
      if (currentView === 'details' && currentCustomerId === cid) {
        populateDetails(result.customer);
      } else {
        applyFilters();
      }
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = editingPaymentId ? t('save') : t('addPayment');
  }
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

  // ESC key to close modals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('paymentModal').classList.contains('show')) {
        closePayModal(); return;
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
}

document.addEventListener('DOMContentLoaded', initCustomers);
