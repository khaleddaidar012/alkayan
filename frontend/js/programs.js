const API_URL = 'http://localhost:5000/api';
let allPrograms = [];
let editingProgramId = null;
let campaignCustomerContext = { programName: null, programId: null, campaignId: null };
let campaignProgramContext = { programId: null, programName: null };
let editingCampaignId = null;
let deleteContext = { type: null, id: null, name: '' };
let currentCampaignId = null;
let currentProgramId = null;
let currentProgramName = '';
let currentCampaignCustomers = [];
let editingCustomerId = null;
let paymentCustomerId = null;

function can(m, a) { const u = getUser(); if (!u) return false; if (u.role === 'admin') return true; return u.permissions && u.permissions[m] && u.permissions[m][a] === true; }
function canManageCampaigns() { const u = getUser(); return u && (u.role === 'admin' || u.role === 'manager'); }
function getUser() { try { return JSON.parse(localStorage.getItem('alkayan_user')); } catch { return null; } }
function getToken() { return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token'); }
function redirectToLogin() { window.location.href = 'login.html'; }
function t(k) { const s = i18n[currentLang]?.programs || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang]; return s[k] || k; }
function showToast(msg, type) {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const t = document.createElement('div'); t.className = 'toast ' + (type || 'success'); t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.classList.add('toast-remove'); setTimeout(() => t.remove(), 300); }, 3000);
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '\u2014'; }
function formatCurrency(a) { 
  if (a == null || isNaN(a)) return '\u2014';
  return Number(a).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' EGP'; 
}
function priceDisplay(label, value, opts) {
  const o = opts || {};
  return '<div class="price-display' + (o.size === 'lg' ? ' price-display-lg' : '') + (o.color ? ' price-display-' + o.color : '') + '">' +
    (label ? '<div class="price-label">' + label + '</div>' : '') +
    '<div class="price-value">' + formatCurrency(value) + '</div></div>';
}

async function apiFetch(url, opts) {
  const t = getToken(); if (!t) { redirectToLogin(); return null; }
  try {
    const r = await fetch(API_URL + url, { ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t, ...(opts?.headers || {}) } });
    const d = await r.json();
    if (!r.ok) {
      if (r.status === 401) { localStorage.removeItem('alkayan_token'); sessionStorage.removeItem('alkayan_token'); localStorage.removeItem('alkayan_user'); redirectToLogin(); return null; }
      showToast(d.message || 'Request failed', 'error'); return null;
    }
    return d;
  } catch (e) { showToast('Server connection failed', 'error'); return null; }
}
async function exportPrograms() {
  showToast(t('exporting') || 'Exporting...', 'info');
  const data = await apiFetch('/programs/export');
  if (!data) { showToast(t('exportFailed'), 'error'); return; }
  const rows = data.programs || [];
  if (rows.length === 0) { showToast(t('noDataExport'), 'info'); return; }
  const h = Object.keys(rows[0]);
  const csv = [h.join(','), ...rows.map(r => h.map(k => { const v = r[k] != null ? String(r[k]) : ''; return v.includes(',') || v.includes('"') ? '\u0022' + v.replace(/"/g, '""') + '\u0022' : v; }).join(','))].join('\n');
  const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = 'programs_export_' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
  URL.revokeObjectURL(a.href);
  showToast(t('exportDownloaded'), 'success');
}

function openExportModal() { document.getElementById('exportModal').classList.add('show'); document.body.classList.add('modal-open'); }
function closeExportModal() { document.getElementById('exportModal').classList.remove('show'); document.body.classList.remove('modal-open'); }
function openComingSoon(msg) { const e = document.getElementById('comingSoonMessage'); if (e && msg) e.textContent = msg; document.getElementById('comingSoonModal').classList.add('show'); document.body.classList.add('modal-open'); }
function closeComingSoon() { document.getElementById('comingSoonModal').classList.remove('show'); document.body.classList.remove('modal-open'); }

async function loadPrograms() {
  showSkeletons(); hideError();
  const d = await apiFetch('/programs');
  if (!d) { hideSkeletons(); showError(); return; }
  allPrograms = d.programs || [];
  hideSkeletons(); renderStats(); applyFilters();
}
function showSkeletons() {
  const grid = document.getElementById('programsGrid');
  const empty = document.getElementById('programsEmpty');
  const stats = document.getElementById('programsStats');
  const err = document.getElementById('programsError');
  if (grid) { grid.classList.add('loading'); grid.innerHTML = ''; for (let i=0;i<8;i++) grid.innerHTML += '<div class="skeleton-card"><div class="skeleton-top"><div class="skeleton-icon"></div><div class="skeleton-title-area"><div class="skeleton-line skeleton-line-sm"></div><div class="skeleton-line skeleton-line-xxs"></div></div></div><div class="skeleton-stats"><div class="skeleton-stat"></div><div class="skeleton-stat"></div><div class="skeleton-stat"></div><div class="skeleton-stat"></div></div><div class="skeleton-line skeleton-line-xxs" style="margin-bottom:12px"></div><div class="skeleton-actions"></div><div class="skeleton-line skeleton-line-xxs" style="margin-top:10px;width:50%"></div></div>'; }
  if (empty) empty.classList.remove('show'); if (stats) stats.classList.add('stats-loading'); if (err) err.style.display = 'none';
}

function hideSkeletons() { const g = document.getElementById('programsGrid'); const s = document.getElementById('programsStats'); if (g) g.classList.remove('loading'); if (s) s.classList.remove('stats-loading'); }
function showError() { document.getElementById('programsGrid').innerHTML = ''; document.getElementById('programsError').style.display = 'block'; }
function hideError() { const e = document.getElementById('programsError'); if (e) e.style.display = 'none'; }

function renderStats() {
  document.getElementById('statTotal').textContent = allPrograms.length;
  document.getElementById('statActive').textContent = allPrograms.filter(p => p.status === 'active').length;
  document.getElementById('statTotalCustomers').textContent = allPrograms.reduce((s, p) => s + (p.totalEnrollments || 0), 0);
  document.getElementById('statActiveCampaigns').textContent = allPrograms.reduce((s, p) => s + (p.activeCampaigns || 0), 0);
}

let searchTimeout = null;
function handleSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(applyFilters, 300); }

function applyFilters() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const sf = document.getElementById('filterStatus')?.value || '';
  let f = allPrograms;
  if (q) f = f.filter(p => p.name.toLowerCase().includes(q) || (p.instructor && p.instructor.toLowerCase().includes(q)));
  if (sf) f = f.filter(p => p.status === sf);
  renderPrograms(f);
}
function renderPrograms(programs) {
  const grid = document.getElementById('programsGrid');
  const empty = document.getElementById('programsEmpty');
  if (!grid) return;
  const items = programs || allPrograms;
  if (items.length === 0) { grid.innerHTML = ''; if (empty) empty.classList.add('show'); return; }
  if (empty) empty.classList.remove('show');
  grid.innerHTML = items.map((p, i) => {
    const sc = p.status || 'draft'; const rev = p.expectedRevenue;
    return '<div class="program-card" data-id="' + p._id + '" style="animation-delay:' + Math.min(i * 0.05, 0.4) + 's">' +
      '<div class="program-card-top"><div class="program-card-icon">📚</div><div class="program-card-title-area"><div class="program-card-name">' + p.name + '</div>' +
      ((p.instructor || p.duration) ? '<div class="program-card-instructor">' + (p.instructor ? '👨‍🏫 ' + p.instructor : '') + (p.instructor && p.duration ? ' \u00b7 ' : '') + (p.duration ? '\u23f1\ufe0f ' + p.duration : '') + '</div>' : '') + '</div>' +
      '<span class="program-status-badge ' + sc + '">' + t(sc) + '</span></div>' +
      '<div class="program-card-price">' + priceDisplay('💰 ' + t('price'), p.price, { size: 'lg' }) + '</div>' +
      '<div class="program-card-stats">' +
      '<div class="program-stat-tile"><div class="program-stat-tile-header"><span class="program-stat-tile-icon">👥</span><span class="program-stat-tile-label">' + t('activeCustomers') + '</span></div><div class="program-stat-tile-value">' + (p.activeCustomers || 0) + '</div></div>' +
      '<div class="program-stat-tile"><div class="program-stat-tile-header"><span class="program-stat-tile-icon">📊</span><span class="program-stat-tile-label">' + t('totalEnrollments') + '</span></div><div class="program-stat-tile-value">' + (p.totalEnrollments || 0) + '</div></div>' +
      '<div class="program-stat-tile"><div class="program-stat-tile-header"><span class="program-stat-tile-icon">📢</span><span class="program-stat-tile-label">' + t('activeCampaigns') + '</span></div><div class="program-stat-tile-value blue">' + (p.activeCampaigns || 0) + '</div></div>' +
      '<div class="program-stat-tile"><div class="program-stat-tile-header"><span class="program-stat-tile-icon">💰</span><span class="program-stat-tile-label">' + t('price') + '</span></div><div class="program-stat-tile-value gold">' + formatCurrency(p.price) + '</div></div></div>' +
      '<div class="program-card-campaign-badge">📢 ' + (p.activeCampaigns || 0) + ' ' + t('campaigns') + ' \u00b7 ' + (p.totalEnrollments || 0) + ' ' + t('customers') + '</div>' +
      '<div class="program-card-actions">' +
      '<button class="program-action-btn view" data-view="' + p._id + '"><span class="action-icon">👁️</span> ' + t('view') + '</button>' +
      (can('programs', 'add') ? '<button class="program-action-btn add-customer" data-addcustomer="' + p._id + '"><span class="action-icon">👤</span> ' + t('addCustomer') + '</button>' : '') +
      (canManageCampaigns() ? '<button class="program-action-btn add-campaign" data-addcampaign="' + p._id + '"><span class="action-icon">📢</span> ' + t('addCampaign') + '</button>' : '') +
      (can('programs', 'delete') ? '<button class="program-action-btn" data-delete="' + p._id + '" style="flex:0;padding:8px 10px"><span class="action-icon">🗑️</span></button>' : '') +
      (can('programs', 'edit') ? '<button class="program-action-btn" data-edit="' + p._id + '" style="flex:0;padding:8px 10px"><span class="action-icon">✏️</span></button>' : '') +
      '</div><div class="program-card-date">' + t('lastUpdated') + ': ' + formatDate(p.updatedAt) + '</div></div>';
  }).join('');
  grid.addEventListener('click', function(e) {
    const target = e.target.closest('[data-view],[data-addcustomer],[data-addcampaign],[data-edit],[data-delete],.program-card');
    if (!target) return;
    e.stopPropagation();
    if (target.classList.contains('program-card') && !e.target.closest('.program-action-btn')) {
      showProgramDetails(target.dataset.id); return;
    }
    if (target.dataset.view) { showProgramDetails(target.dataset.view); return; }
    if (target.dataset.addcustomer) { const p = allPrograms.find(x => x._id === target.dataset.addcustomer); if (p) openAddCustomerFromCampaign(null, p.name); return; }
    if (target.dataset.addcampaign) { const p = allPrograms.find(x => x._id === target.dataset.addcampaign); if (p) openAddCampaign(p._id, p.name); return; }
    if (target.dataset.edit) { openEditModal(target.dataset.edit); return; }
    if (target.dataset.delete) { const nm = target.closest('.program-card')?.querySelector('.program-card-name')?.textContent || ''; openDeleteModal('program', target.dataset.delete, nm); }
  });
}

function renderStatCards(s, r) {
  r = r || {};
  const items = [
    { v: s.activeCustomers || 0, c: 'green', k: 'activeCustomers' }, { v: s.totalCustomers || 0, c: '', k: 'totalCustomers' },
    { v: s.potentialCustomers || 0, c: 'gold', k: 'potentialCustomers' }, { v: s.rejectedCustomers || 0, c: 'red', k: 'rejectedCustomers' },
    { v: r.expectedRevenue || 0, c: 'gold', k: 'expectedRevenue' }, { v: r.collectedRevenue || 0, c: 'green', k: 'collectedRevenue' },
    { v: r.remainingPayments || 0, c: 'red', k: 'remainingPayments' }, { v: s.totalCampaigns || 0, c: '', k: 'totalCampaigns' },
    { v: s.activeCampaigns || 0, c: 'blue', k: 'activeCampaigns' }, { v: s.completedCampaigns || 0, c: '', k: 'finishedCampaigns' }
  ];
  return items.map(x => '<div class="program-stat-card"><div class="program-stat-card-value' + (x.c ? ' ' + x.c : '') + '">' + (typeof x.v === 'number' ? x.v.toLocaleString() : x.v) + '</div><div class="program-stat-card-label">' + t(x.k) + '</div></div>').join('');
}
function showProgramDetails(programId) {
  currentProgramId = programId; currentProgramName = '';
  document.getElementById('programsGrid').style.display = 'none';
  document.getElementById('programsEmpty').style.display = 'none';
  document.querySelector('.customers-toolbar').style.display = 'none';
  document.getElementById('filtersBar').style.display = 'none';
  document.getElementById('programsStats').style.display = 'none';
  document.getElementById('programDetails').style.display = 'block';
  document.getElementById('campaignDetails').style.display = 'none';
  const container = document.getElementById('detailsContent');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';

  apiFetch('/programs/' + programId).then(async data => {
    if (!data || !data.program) return;
    const p = data.program; const s = data.stats || {};
    const activeCamps = data.activeCampaigns || [];
    const completedCamps = data.completedCampaigns || [];
    const sc = p.status || 'draft'; const customers = data.customers || [];
    currentProgramName = p.name || '';
    const empData = await apiFetch('/users'); const employees = empData?.users || [];
    const cardHtml = (c, idx) => {
      const cs = c.status || 'active';
      return '<div class="campaign-detail-card" data-campaign-id="' + c._id + '" style="animation-delay:' + Math.min(idx * 0.05, 0.4) + 's">' +
        '<div class="campaign-detail-card-header"><div class="campaign-detail-card-name">📢 ' + c.name + '</div><span class="program-status-badge ' + cs + '">' + t(cs) + '</span></div>' +
        '<div class="campaign-detail-card-dates">📅 ' + formatDate(c.startDate) + ' \u2014 ' + formatDate(c.endDate) + '</div>' +
        '<div class="campaign-detail-card-stats"><div class="campaign-detail-stat"><div class="campaign-detail-stat-value blue">' + (c.leadsCount || 0) + '</div><div class="campaign-detail-stat-label">' + t('leadsCount') + '</div></div>' +
        '<div class="campaign-detail-stat"><div class="campaign-detail-stat-value green">' + (c.registeredCustomers || 0) + '</div><div class="campaign-detail-stat-label">' + t('registeredCustomers') + '</div></div>' +
        '<div class="campaign-detail-stat"><div class="campaign-detail-stat-value gold">' + (c.conversionRate || 0) + '%</div><div class="campaign-detail-stat-label">' + t('conversionRate') + '</div></div></div>' +
        '<div class="campaign-detail-card-budget">' + priceDisplay('💰 ' + t('budget'), c.budget, { size: 'lg' }) + '</div>' +
        '<div class="campaign-detail-card-employees">' + ((c.assignedEmployees || []).map(e => '<span class="campaign-employee-badge">' + e.name + '</span>').join('') || '<span style="font-size:11px;color:var(--text-muted)">' + t('none') + '</span>') + '</div>' +
        '<div class="campaign-detail-card-footer">' +
        '<button class="campaign-detail-btn open" data-campaign-view="' + c._id + '">🔍 ' + t('view') + '</button>' +
        (canManageCampaigns() ? '<button class="campaign-detail-btn" data-campaign-edit="' + c._id + '">✏️ ' + t('edit') + '</button>' : '') +
        (canManageCampaigns() ? '<button class="campaign-detail-btn" data-campaign-delete="' + c._id + '" style="color:var(--danger)">🗑️ ' + t('delete') + '</button>' : '') + '</div></div>';
    };
    container.innerHTML =
      '<div class="program-details-section"><div class="details-card-header"><h3>' + t('programDetails') + '</h3><div>' +
      '<span class="program-status-badge ' + sc + '">' + t(sc) + '</span>' +
      '<button class="btn btn-sm" id="addCustFromProgramBtn" style="margin-inline-start:8px;background:var(--success)">👤 ' + t('addCustomer') + '</button>' +
      (canManageCampaigns() ? '<button class="btn btn-sm" id="addCampaignFromProgramBtn" style="margin-inline-start:4px;background:var(--info)">📢 ' + t('addCampaign') + '</button>' : '') +
      (can('programs', 'edit') ? '<button class="btn btn-sm" id="detailsEditBtn" style="margin-inline-start:4px">✏️ ' + t('edit') + '</button>' : '') +
      (can('programs', 'delete') ? '<button class="btn btn-sm" id="detailsDeleteBtn" style="margin-inline-start:4px;background:var(--danger)">🗑️ ' + t('delete') + '</button>' : '') +
      '</div></div>' +
      '<div class="program-info-grid">' +
      '<div class="program-info-item"><span class="program-info-label">' + t('name') + '</span><span class="program-info-value">' + p.name + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('price') + '</span>' + priceDisplay('', p.price, { color: 'gold' }) + '</div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('duration') + '</span><span class="program-info-value">' + (p.duration || '\u2014') + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('instructor') + '</span><span class="program-info-value">' + (p.instructor || '\u2014') + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('startDate') + '</span><span class="program-info-value">' + formatDate(p.startDate) + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('endDate') + '</span><span class="program-info-value">' + formatDate(p.endDate) + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('capacity') + '</span><span class="program-info-value">' + (p.capacity || '\u2014') + '</span></div>' +
      '<div class="program-info-item"><span class="program-info-label">' + t('status') + '</span><span class="program-info-value">' + t(sc) + '</span></div>' +
      (p.description ? '<div class="program-info-item" style="grid-column:1/-1"><span class="program-info-label">' + t('description') + '</span><span class="program-info-value">' + p.description + '</span></div>' : '') +
      '</div></div>' +
      '<div class="program-details-section"><h3>📊 ' + t('statistics') + '</h3><div class="program-stats-grid" id="statsGrid">' + renderStatCards(s, {}) + '</div></div>' +
      (s.employeeWorkload && s.employeeWorkload.length > 0 ?
      '<div class="program-details-section"><h3>👥 ' + t('employeeWorkload') + '</h3><div class="employee-workload-table"><table><thead><tr><th>' + t('employee') + '</th><th>' + t('totalCampaignsEmp') + '</th><th>' + t('activeCampaignsEmp') + '</th><th>' + t('assignedCustomers') + '</th><th>' + t('subscribedCustomers') + '</th><th>' + t('conversionRate') + '</th></tr></thead><tbody>' +
      s.employeeWorkload.map(ew => '<tr><td><strong>' + ew.name + '</strong></td><td>' + ew.totalCampaigns + '</td><td>' + ew.activeCampaigns + '</td><td>' + ew.totalCustomers + '</td><td>' + ew.subscribedCustomers + '</td><td><span class="employee-conversion ' + (ew.conversionRate >= 50 ? 'green' : ew.conversionRate > 0 ? 'gold' : '') + '">' + ew.conversionRate + '%</span></td></tr>').join('') +
      '</tbody></table></div></div>' : '') +
      (customers.length > 0 ?
      '<div class="program-details-section"><h3 style="display:flex;align-items:center;gap:8px">👥 ' + t('customers') + ' <span style="font-weight:400;font-size:13px;color:var(--text-muted)">(' + customers.length + ')</span></h3>' +
      '<div class="customer-assign-table"><table><thead><tr><th>' + t('customerName') + '</th><th>' + t('phone') + '</th><th>' + t('status') + '</th><th>' + t('assignedEmployee') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' +
      customers.map(cust => '<tr><td><strong>' + cust.name + '</strong></td><td>' + (cust.phone || '-') + '</td><td><span class="program-status-badge ' + cust.status + '">' + t(cust.status) + '</span></td><td>' +
      '<select class="assign-employee-select" data-customer-id="' + cust._id + '" data-original-value="' + ((cust.assignedEmployee?._id || cust.assignedEmployee || '')) + '"><option value="">' + t('none') + '</option>' +
      employees.map(emp => '<option value="' + emp._id + '" ' + ((cust.assignedEmployee?._id === emp._id || cust.assignedEmployee === emp._id) ? 'selected' : '') + '>' + emp.name + '</option>').join('') +
      '</select></td><td><div style="display:flex;gap:6px">' +
      '<button class="customer-campaign-action view" data-cust-view="' + cust._id + '" style="flex:0;padding:5px 10px">👁️ ' + t('view') + '</button>' +
      (can('customers', 'edit') ? '<button class="customer-campaign-action edit" data-cust-edit="' + cust._id + '" style="flex:0;padding:5px 10px">✏️ ' + t('edit') + '</button>' : '') +
      '</div></td></tr>').join('') +
      '</tbody></table></div></div>' : '') +
      '<div class="program-details-section"><div class="campaign-section-header"><h3>🟢 ' + t('activeCampaigns') + '</h3><span class="campaign-section-count">' + activeCamps.length + '</span></div>' +
      (activeCamps.length > 0 ? '<div class="campaigns-list">' + activeCamps.map((c, i) => cardHtml(c, i)).join('') + '</div>' : '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">' + t('noCampaigns') + '</p>') + '</div>' +
      (completedCamps.length > 0 ?
      '<div class="program-details-section"><div class="campaign-section-header"><h3>✅ ' + t('completed') + '</h3><span class="campaign-section-count">' + completedCamps.length + '</span></div><div class="campaigns-list">' + completedCamps.map((c, i) => cardHtml(c, i)).join('') + '</div></div>' : '');
    apiFetch('/programs/' + programId + '/stats').then(sd => { if (sd && sd.stats) { const g = document.getElementById('statsGrid'); if (g) g.innerHTML = renderStatCards(s, sd.stats); } });
    document.querySelectorAll('.assign-employee-select').forEach(sel => {
      sel.addEventListener('change', async function() {
        const cid = this.dataset.customerId; const eid = this.value || null; const orig = this.dataset.originalValue || '';
        this.disabled = true;
        const result = await apiFetch('/customers/' + cid, { method: 'PUT', body: JSON.stringify({ assignedEmployee: eid }) });
        this.disabled = false;
        if (result) { this.dataset.originalValue = this.value; showToast(t('employeeAssigned'), 'success'); } else { this.value = orig; }
      });
    });
  });
}

function hideProgramDetails() {
  document.getElementById('programDetails').style.display = 'none';
  document.getElementById('campaignDetails').style.display = 'none';
  const grid = document.getElementById('programsGrid');
  if (grid) { grid.style.display = ''; grid.innerHTML = ''; }
  document.querySelector('.customers-toolbar').style.display = '';
  document.getElementById('filtersBar').style.display = '';
  document.getElementById('programsStats').style.display = '';
  const empty = document.getElementById('programsEmpty');
  if (allPrograms.length === 0) { if (empty) empty.classList.add('show'); } else { if (empty) empty.classList.remove('show'); }
  applyFilters();
}

function campaignStatCard(icon, value, label, color, count) {
  return '<div class="campaign-stat-card ' + (color || '') + '" data-count="' + (count || 0) + '"><div class="campaign-stat-icon">' + icon + '</div><div class="campaign-stat-value count-up">' + value + '</div><div class="campaign-stat-label">' + label + '</div></div>';
}
function custCard(cust) {
  const st = cust.status || 'potential'; const ps = cust.payment?.status || 'notPaid';
  const total = cust.payment?.finalPrice || 0;
  const paid = cust.payment?.paidAmount || 0;
  const remaining = cust.payment?.remainingAmount || 0;
  const waPhone = cust.whatsapp || cust.phone || '';
  let subIcon = '';
  if (st === 'subscribed') subIcon = '🟢';
  else if (st === 'potential') subIcon = '⭐';
  else subIcon = '🔴';
  return '<div class="customer-campaign-card" data-customer-id="' + cust._id + '"><div class="customer-campaign-card-top"><div class="customer-campaign-name">' + cust.name + '</div><span class="customer-status-badge ' + st + '">' + subIcon + ' ' + t(st) + '</span></div>' +
    '<div class="customer-campaign-info">' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">📱 ' + t('phone') + '</span><span class="customer-campaign-info-value">' + (cust.phone || '\u2014') + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">💬 ' + t('whatsapp') + '</span><span class="customer-campaign-info-value">' + (cust.whatsapp || cust.phone || '\u2014') + (waPhone ? ' <a href="https://wa.me/' + waPhone.replace(/[^0-9]/g, '') + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:10px;background:#25D366;color:#fff;font-size:10px;text-decoration:none;margin-inline-start:4px">💬</a>' : '') + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">👤 ' + t('assignedEmployee') + '</span><span class="customer-campaign-info-value">' + (cust.assignedEmployee?.name || t('none')) + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">📅 ' + t('registrationDate') + '</span><span class="customer-campaign-info-value">' + formatDate(cust.registrationDate) + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">💰 ' + t('totalAmount') + '</span><span class="customer-campaign-info-value">' + priceDisplay('', total, { size: 'sm' }) + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">✅ ' + t('paidAmount') + '</span><span class="customer-campaign-info-value">' + priceDisplay('', paid, { size: 'sm', color: 'green' }) + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">⏳ ' + t('remainingAmount') + '</span><span class="customer-campaign-info-value">' + priceDisplay('', remaining, { size: 'sm', color: remaining > 0 ? 'red' : 'green' }) + '</span></div>' +
    '<div class="customer-campaign-info-item"><span class="customer-campaign-info-label">🏷️ ' + t('paymentStatus') + '</span><span class="customer-campaign-info-value"><span class="payment-status-badge ' + ps + '">' + t(ps) + '</span></span></div></div>' +
    '<div class="customer-campaign-actions">' +
    '<button class="customer-campaign-action view" data-cust-view="' + cust._id + '">👁️ ' + t('view') + '</button>' +
    (can('customers', 'edit') ? '<button class="customer-campaign-action edit" data-cust-edit="' + cust._id + '">✏️ ' + t('edit') + '</button>' : '') +
    (can('customers', 'edit') ? '<button class="customer-campaign-action pay" data-cust-pay="' + cust._id + '">💳 ' + t('addPayment') + '</button>' : '') +
    '<button class="customer-campaign-action remove" data-cust-remove="' + cust._id + '" data-cust-name="' + cust.name.replace(/'/g, '') + '">✕ ' + t('remove') + '</button></div></div>';
}
function renderCampaignCustomersList(customers) {
  if (!customers || customers.length === 0) return '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px">' + t('noCustomers') + '</p>';
  return '<div class="customer-campaign-grid">' + customers.map(c => custCard(c)).join('') + '</div>';
}
function refreshCampaignCustomersSection() {
  const list = document.getElementById('campaignCustomersList');
  if (list) list.innerHTML = renderCampaignCustomersList(currentCampaignCustomers);
  const count = document.getElementById('campaignCustomersCount');
  if (count) count.textContent = '(' + currentCampaignCustomers.length + ')';
}
function updateCampaignCustomerCard(customer) {
  if (!customer) return;
  const card = document.querySelector('.customer-campaign-card[data-customer-id="' + customer._id + '"]');
  if (card) {
    const tmp = document.createElement('div');
    tmp.innerHTML = custCard(customer);
    const fresh = tmp.firstElementChild;
    if (fresh) card.replaceWith(fresh);
  }
  const count = document.getElementById('campaignCustomersCount');
  if (count) count.textContent = '(' + currentCampaignCustomers.length + ')';
}
function showCampaignDetails(campaignId, programId) {
  currentCampaignId = campaignId; currentProgramId = programId;
  document.getElementById('programDetails').style.display = 'none';
  document.getElementById('campaignDetails').style.display = 'block';
  const container = document.getElementById('campaignDetailsContent');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';

  apiFetch('/campaigns/' + campaignId).then(async data => {
    if (!data || !data.campaign) return;
    const c = data.campaign; const cs = c.status || 'active'; const program = c.program || {};
    const employees = c.assignedEmployees || []; const customers = c.customers || [];
    currentCampaignCustomers = customers;
    container.innerHTML =
      '<div class="campaign-details-layout"><div class="campaign-details-header-bar"><h2>📢 ' + c.name + '</h2><span class="program-status-badge ' + cs + '" style="font-size:13px;padding:6px 16px">' + t(cs) + '</span></div>' +
      '<div class="program-details-section"><h3>📋 ' + t('campaignInfo') + '</h3><div class="campaign-info-brief">' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">' + t('program') + '</span><span class="campaign-info-brief-value">' + (program.name || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">' + t('startDate') + '</span><span class="campaign-info-brief-value">' + formatDate(c.startDate) + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">' + t('endDate') + '</span><span class="campaign-info-brief-value">' + formatDate(c.endDate) + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">' + t('budget') + '</span>' + priceDisplay('', c.budget, { color: 'gold' }) + '</div>' +
      (c.description ? '<div class="campaign-info-brief-item" style="grid-column:1/-1"><span class="campaign-info-brief-label">' + t('description') + '</span><span class="campaign-info-brief-value">' + c.description + '</span></div>' : '') + '</div></div>' +
      '<div class="program-details-section"><h3>📊 ' + t('statistics') + '</h3><div class="campaign-stats-grid" id="campaignStatsGrid">' +
      campaignStatCard('👥', (c.leadsCount || 0).toLocaleString(), t('leadsCount'), 'blue', c.leadsCount || 0) +
      campaignStatCard('👤', (c.registeredCustomers || 0).toLocaleString(), t('registeredCustomers'), 'green', c.registeredCustomers || 0) +
      campaignStatCard('📈', (c.conversionRate || 0) + '%', t('conversionRate'), 'gold', c.conversionRate || 0) +
      campaignStatCard('💰', formatCurrency(c.budget), t('budget'), 'purple', c.budget || 0) +
      campaignStatCard('💵', formatCurrency(customers.reduce((s, cx) => s + (cx.payment?.paidAmount || 0), 0)), t('collectedRevenue'), 'green', customers.reduce((s, cx) => s + (cx.payment?.paidAmount || 0), 0)) +
      campaignStatCard('⌛', customers.filter(cx => (cx.payment?.status || 'notPaid') === 'notPaid').length.toString(), t('remainingPayments'), 'orange', customers.filter(cx => (cx.payment?.status || 'notPaid') === 'notPaid').length) +
      campaignStatCard('👨‍💼', employees.length.toString(), t('assignedEmployees'), 'cyan', employees.length) +
      campaignStatCard('📅', c.startDate && c.endDate ? Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000*60*60*24)) + ' ' + t('days') : '\u2014', t('campaignDuration'), 'pink', 0) +
      '</div></div>' +
      '<div class="program-details-section"><h3>👤 ' + t('assignedEmployees') + ' (' + employees.length + ')</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' +
      (employees.length > 0 ? employees.map(emp => '<div style="display:flex;align-items:center;gap:8px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:8px 14px"><div style="width:28px;height:28px;border-radius:50%;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">' + emp.name.charAt(0).toUpperCase() + '</div><div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + emp.name + '</div><div style="font-size:11px;color:var(--text-muted)">' + (emp.role || '') + '</div></div></div>').join('') : '<span style="font-size:13px;color:var(--text-muted)">' + t('none') + '</span>') + '</div></div>' +
      '<div class="program-details-section" id="campaignCustomersSection"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color)"><h3 style="margin:0;padding:0;border:none">👥 ' + t('customers') + ' <span id="campaignCustomersCount">(' + customers.length + ')</span></h3><button class="btn btn-sm btn-primary" id="addCustomerFromCampaignBtn">👤 ' + t('addCustomer') + '</button></div>' +
      '<div id="campaignCustomersList">' + renderCampaignCustomersList(customers) + '</div>' + '</div>' +
      (c.notes ? '<div class="program-details-section"><h3>📝 ' + t('notes') + '</h3><p class="campaign-description-text">' + c.notes + '</p></div>' : '') + '</div>';
  });
}

async function removeCustomerFromCampaign(campaignId, customerId) {
  const result = await apiFetch('/campaigns/' + campaignId + '/customers/' + customerId, { method: 'DELETE' });
  if (result) {
    currentCampaignCustomers = currentCampaignCustomers.filter(c => c._id !== customerId);
    refreshCampaignCustomersSection();
    showToast(t('customerRemoved') || 'Customer removed from campaign', 'success');
  }
}

function hideCampaignDetails() {
  document.getElementById('campaignDetails').style.display = 'none';
  document.getElementById('programDetails').style.display = 'block';
  if (currentProgramId) showProgramDetails(currentProgramId);
}
function openAddModal() {
  editingProgramId = null;
  document.getElementById('programForm').reset();
  document.getElementById('modalTitle').textContent = t('addProgram');
  document.getElementById('formSubmit').textContent = t('save');
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('formStartDate')) document.getElementById('formStartDate').value = today;
  document.getElementById('programModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function openEditModal(programId) {
  const p = allPrograms.find(x => x._id === programId);
  if (!p) return;
  editingProgramId = programId;
  document.getElementById('modalTitle').textContent = t('editProgram');
  document.getElementById('formSubmit').textContent = t('save');
  document.getElementById('formName').value = p.name || '';
  document.getElementById('formDescription').value = p.description || '';
  document.getElementById('formPrice').value = p.price || '';
  document.getElementById('formDuration').value = p.duration || '';
  document.getElementById('formInstructor').value = p.instructor || '';
  document.getElementById('formStartDate').value = p.startDate ? p.startDate.split('T')[0] : '';
  document.getElementById('formEndDate').value = p.endDate ? p.endDate.split('T')[0] : '';
  document.getElementById('formCapacity').value = p.capacity || '';
  document.getElementById('formStatus').value = p.status || 'draft';
  document.getElementById('programModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeModal() { document.getElementById('programModal').classList.remove('show'); document.body.classList.remove('modal-open'); editingProgramId = null; }

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('formSubmit');
  btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span>';
  const body = {
    name: document.getElementById('formName').value.trim(),
    description: document.getElementById('formDescription').value.trim(),
    price: parseFloat(document.getElementById('formPrice').value) || 0,
    duration: document.getElementById('formDuration').value.trim(),
    instructor: document.getElementById('formInstructor').value.trim(),
    startDate: document.getElementById('formStartDate').value || null,
    endDate: document.getElementById('formEndDate').value || null,
    capacity: parseInt(document.getElementById('formCapacity').value) || 30,
    status: document.getElementById('formStatus').value || 'draft'
  };
  if (!body.name) { document.getElementById('formName').style.borderColor = 'var(--danger)'; showToast('Program name is required', 'error'); btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); return; }
  const result = editingProgramId ? await apiFetch('/programs/' + editingProgramId, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/programs', { method: 'POST', body: JSON.stringify(body) });
  btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save');
  if (result) { closeModal(); showToast(editingProgramId ? t('programUpdated') : t('programCreated'), 'success'); await loadPrograms(); }
}

function openAddCustomerFromCampaign(campaignId, programName) {
  campaignCustomerContext = { programName, programId: currentProgramId, campaignId };
  document.getElementById('customerForm').reset();
  document.getElementById('customerModalTitle').textContent = t('addCustomer');
  document.getElementById('custFormProgram').value = programName || '';
  document.getElementById('custFormDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('custFormPaymentSection').style.display = 'none';
  document.getElementById('custFormPayAmount').value = '';
  document.getElementById('custFormPayMethod').value = 'cash';
  document.getElementById('custFormPayNotes').value = '';
  const prog = (allPrograms || []).find(x => x._id === currentProgramId) || (allPrograms || []).find(x => x.name === programName);
  const priceWrap = document.getElementById('custFormProgramPriceWrap');
  const priceEl = document.getElementById('custFormProgramPrice');
  if (prog && prog.price !== undefined && prog.price !== null && prog.price > 0) {
    if (priceEl) priceEl.innerHTML = priceDisplay('', prog.price, { size: 'lg', color: 'gold' });
    if (priceWrap) priceWrap.style.display = '';
    document.getElementById('custFormPayAmount').value = prog.price;
  } else {
    if (priceWrap) priceWrap.style.display = 'none';
  }
  document.getElementById('customerModal').classList.add('show');
  document.body.classList.add('modal-open');
  populateEmployeeDropdown();
  const statusSelect = document.getElementById('custFormStatus');
  const togglePaySection = function() {
    document.getElementById('custFormPaymentSection').style.display = this.value === 'subscribed' ? '' : 'none';
  };
  statusSelect.removeEventListener('change', togglePaySection);
  statusSelect.addEventListener('change', togglePaySection);
}

async function populateEmployeeDropdown() {
  const select = document.getElementById('custFormEmployee');
  if (!select) return;
  const data = await apiFetch('/users');
  if (!data) return;
  select.innerHTML = '<option value="">' + t('none') + '</option>';
  (data.users || []).forEach(emp => { const o = document.createElement('option'); o.value = emp._id; o.textContent = emp.name; select.appendChild(o); });
}

function closeCustomerModal() { document.getElementById('customerModal').classList.remove('show'); document.body.classList.remove('modal-open'); campaignCustomerContext = { programName: null, programId: null, campaignId: null }; editingCustomerId = null; }

function openPaymentModal(customerId) {
  const cust = (currentCampaignCustomers || []).find(c => c._id === customerId);
  if (!cust) return;
  paymentCustomerId = customerId;
  const saveBtnLabel = '<span class="pay-save-icon">💳</span> <span>' + t('addPayment') + '</span>';
  document.getElementById('payModalTitle').textContent = t('addPayment');
  document.getElementById('payFormSubmit').innerHTML = saveBtnLabel;
  document.getElementById('payFormAmount').value = '';
  document.getElementById('payFormAmount').style.borderColor = '';
  document.getElementById('payFormMethod').value = 'cash';
  document.getElementById('payFormReference').value = '';
  document.getElementById('payFormNotes').value = '';
  document.getElementById('payFormDate').value = new Date().toISOString().split('T')[0];

  document.getElementById('payCustomerName').textContent = cust.name || '\u2014';
  document.getElementById('payCustomerAvatar').textContent = (cust.name || '?').trim().charAt(0).toUpperCase();
  const programName = (cust.programRef && cust.programRef.name) || cust.program || '';
  const phone = cust.phone || cust.whatsapp || '\u2014';
  document.getElementById('payCustomerMeta').textContent = '\uD83D\uDCF1 ' + phone + (programName ? ' \u00B7 \uD83D\uDCDA ' + programName : '');
  const st = cust.status || 'potential';
  const stEl = document.getElementById('payCustomerStatus');
  stEl.className = 'customer-status-badge ' + st;
  let subIcon = '\uD83D\uDFE2';
  if (st === 'potential') subIcon = '\u2B50';
  else if (st !== 'subscribed') subIcon = '\uD83D\uDD34';
  stEl.textContent = subIcon + ' ' + t(st);

  const total = cust.payment?.finalPrice || 0;
  document.getElementById('payFormRemaining').textContent = formatCurrency(cust.payment?.remainingAmount || 0);
  document.getElementById('payFormTotalHint').textContent = t('totalAmount') + ': ' + formatCurrency(total);
  document.getElementById('paymentModal').classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(() => { const el = document.getElementById('payFormAmount'); if (el) el.focus(); }, 120);
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  paymentCustomerId = null;
}

async function handlePaymentFormSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!paymentCustomerId) return;
  const btn = document.getElementById('payFormSubmit');
  const saveBtnLabel = '<span class="pay-save-icon">💳</span> <span>' + t('addPayment') + '</span>';
  btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span>';
  const body = {
    amount: parseFloat(document.getElementById('payFormAmount')?.value) || 0,
    method: document.getElementById('payFormMethod')?.value || 'cash',
    referenceNumber: (document.getElementById('payFormReference')?.value || '').trim(),
    notes: (document.getElementById('payFormNotes')?.value || '').trim()
  };
  const dateInput = document.getElementById('payFormDate');
  if (dateInput && dateInput.value) body.date = dateInput.value;
  if (body.amount <= 0) {
    document.getElementById('payFormAmount').style.borderColor = 'var(--danger)';
    showToast(t('enterValidAmount') || 'Enter a valid amount', 'error');
    btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = saveBtnLabel;
    return;
  }
  try {
    const result = await apiFetch('/customers/' + paymentCustomerId + '/payments', { method: 'POST', body: JSON.stringify(body) });
    if (result && result.customer) {
      const cid = result.customer._id;
      closePaymentModal();
      const idx = currentCampaignCustomers.findIndex(c => c._id === cid);
      if (idx >= 0) currentCampaignCustomers[idx] = result.customer;
      else currentCampaignCustomers.unshift(result.customer);
      updateCampaignCustomerCard(result.customer);
      showToast(t('paymentAdded') || 'Payment added successfully', 'success');
    }
  } catch (err) {
    showToast('Error: ' + (err && err.message ? err.message : 'Something went wrong'), 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = saveBtnLabel;
  }
}


async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('customerFormSubmit');
  btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span>';
  const body = {
    name: document.getElementById('custFormName').value.trim(),
    phone: document.getElementById('custFormPhone').value.trim(),
    whatsapp: document.getElementById('custFormWhatsapp').value.trim(),
    email: document.getElementById('custFormEmail').value.trim(),
    address: document.getElementById('custFormAddress').value.trim(),
    program: campaignCustomerContext.programName || document.getElementById('custFormProgram').value.trim(),
    assignedEmployee: document.getElementById('custFormEmployee').value || null,
    registrationDate: document.getElementById('custFormDate').value || null,
    status: document.getElementById('custFormStatus').value || 'potential',
    notes: document.getElementById('custFormNotes').value.trim(),
    campaign: campaignCustomerContext.campaignId || null,
    programRef: campaignCustomerContext.programId || null,
    registrationSource: campaignCustomerContext.campaignId ? 'campaign' : 'direct'
  };
  if (!body.name || !body.phone) {
    if (!body.name) document.getElementById('custFormName').style.borderColor = 'var(--danger)';
    if (!body.phone) document.getElementById('custFormPhone').style.borderColor = 'var(--danger)';
    showToast('Name and phone are required', 'error');
    btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); return;
  }
  if (body.status === 'subscribed') {
    const payAmount = parseFloat(document.getElementById('custFormPayAmount')?.value) || 0;
    if (payAmount > 0) {
      const prog = (allPrograms || []).find(x => x._id === campaignCustomerContext.programId) || (allPrograms || []).find(x => x.name === body.program);
      const payment = {
        paidAmount: payAmount,
        method: document.getElementById('custFormPayMethod')?.value || 'cash',
        notes: document.getElementById('custFormPayNotes')?.value?.trim() || ''
      };
      if (!editingCustomerId && prog && prog.price !== undefined && prog.price > 0) payment.totalAmount = prog.price;
      body.payment = payment;
    }
  }
  const isEdit = !!editingCustomerId;
  const url = isEdit ? '/customers/' + editingCustomerId : '/customers';
  const method = isEdit ? 'PUT' : 'POST';
  const result = await apiFetch(url, { method, body: JSON.stringify(body) });
  btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save');
  if (result) {
    const ctxCampaignId = campaignCustomerContext.campaignId;
    const ctxProgramId = campaignCustomerContext.programId;
    const ctxProgramName = campaignCustomerContext.programName;
    closeCustomerModal(); editingCustomerId = null;
    showToast(isEdit ? t('customerUpdated') : t('customerCreated'), 'success');
    if (ctxCampaignId) {
      if (isEdit) {
        const idx = currentCampaignCustomers.findIndex(c => c._id === result.customer._id);
        if (idx >= 0) currentCampaignCustomers[idx] = result.customer;
        else currentCampaignCustomers.unshift(result.customer);
      } else {
        currentCampaignCustomers.unshift(result.customer);
      }
      refreshCampaignCustomersSection();
    }
    else if (ctxProgramId) showProgramDetails(ctxProgramId);
    else if (ctxProgramName) { const cp = allPrograms.find(p => p.name === ctxProgramName); if (cp) showProgramDetails(cp._id); else loadPrograms(); }
    else loadPrograms();
  }
}
function openAddCampaign(programId, programName) {
  try {
    editingCampaignId = null;
    campaignProgramContext = { programId, programName };
    const form = document.getElementById('campaignForm');
    if (form) form.reset();
    const titleEl = document.getElementById('campaignModalTitle');
    if (titleEl) titleEl.textContent = t('addCampaign');
    const progEl = document.getElementById('campFormProgram');
    if (progEl) progEl.value = programName || '';
    const today = new Date().toISOString().split('T')[0];
    const startEl = document.getElementById('campFormStartDate');
    if (startEl) startEl.value = today;
    const modal = document.getElementById('campaignModal');
    if (modal) { modal.classList.add('show'); } else { showToast('Campaign modal not found', 'error'); return; }
    document.body.classList.add('modal-open');
    populateCampaignEmployees();
  } catch (err) {
    showToast('Failed to open campaign modal: ' + err.message, 'error');
  }
}

function openEditCampaign(campaignId) {
  try {
    editingCampaignId = campaignId;
    const titleEl = document.getElementById('campaignModalTitle');
    if (titleEl) titleEl.textContent = t('editCampaign');
    const progEl = document.getElementById('campFormProgram');
    if (progEl) progEl.value = '';
    const modal = document.getElementById('campaignModal');
    if (modal) { modal.classList.add('show'); } else { showToast('Campaign modal not found', 'error'); return; }
    document.body.classList.add('modal-open');
    apiFetch('/campaigns/' + campaignId).then(data => {
      if (!data || !data.campaign) return;
      const c = data.campaign;
      campaignProgramContext = { programId: c.program?._id || c.program, programName: c.program?.name || '' };
      const nameEl = document.getElementById('campFormName'); if (nameEl) nameEl.value = c.name || '';
      const progEl = document.getElementById('campFormProgram'); if (progEl) progEl.value = c.program?.name || '';
      const sdEl = document.getElementById('campFormStartDate'); if (sdEl) sdEl.value = c.startDate ? c.startDate.split('T')[0] : '';
      const edEl = document.getElementById('campFormEndDate'); if (edEl) edEl.value = c.endDate ? c.endDate.split('T')[0] : '';
      const bgEl = document.getElementById('campFormBudget'); if (bgEl) bgEl.value = c.budget || '';
      const stEl = document.getElementById('campFormStatus'); if (stEl) stEl.value = c.status || 'active';
      const descEl = document.getElementById('campFormDescription'); if (descEl) descEl.value = c.description || '';
      const notesEl = document.getElementById('campFormNotes'); if (notesEl) notesEl.value = c.notes || '';
      populateCampaignEmployees(c.assignedEmployees || []);
    });
  } catch (err) {
    showToast('Failed to edit campaign: ' + err.message, 'error');
  }
}

async function populateCampaignEmployees(selectedIds) {
  const container = document.getElementById('campFormEmployees');
  if (!container) return;
  const data = await apiFetch('/users');
  if (!data) return;
  const sel = new Set(selectedIds || []);
  container.innerHTML = (data.users || []).map(emp =>
    '<label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;color:var(--text-primary)">' +
    '<input type="checkbox" class="camp-employee-checkbox" value="' + emp._id + '" style="accent-color:var(--gold)"' + (sel.has(emp._id) ? ' checked' : '') + '>' + emp.name + '</label>'
  ).join('');
}

function closeCampaignModal() { document.getElementById('campaignModal').classList.remove('show'); document.body.classList.remove('modal-open'); campaignProgramContext = { programId: null, programName: null }; editingCampaignId = null; }

async function handleCampaignFormSubmit(e) {
  e.preventDefault();
  try {
    const btn = document.getElementById('campaignFormSubmit');
    if (!btn) return;
    btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span>';
    const cbs = document.querySelectorAll('.camp-employee-checkbox:checked');
    const body = {
      name: document.getElementById('campFormName')?.value?.trim() || '',
      program: campaignProgramContext.programId,
      startDate: document.getElementById('campFormStartDate')?.value || null,
      endDate: document.getElementById('campFormEndDate')?.value || null,
      budget: parseFloat(document.getElementById('campFormBudget')?.value) || 0,
      status: document.getElementById('campFormStatus')?.value || 'active',
      description: document.getElementById('campFormDescription')?.value?.trim() || '',
      notes: document.getElementById('campFormNotes')?.value?.trim() || '',
      assignedEmployees: Array.from(cbs).map(cb => cb.value)
    };
    if (!body.name) { const el = document.getElementById('campFormName'); if (el) el.style.borderColor = 'var(--danger)'; showToast('Campaign name is required', 'error'); btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); return; }
    if (!body.startDate || !body.endDate) { showToast('Start and end dates are required', 'error'); btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); return; }
    if (!body.program) { showToast('Program context is missing. Please reopen from a Program.', 'error'); btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); return; }
    const result = editingCampaignId ? await apiFetch('/campaigns/' + editingCampaignId, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/campaigns', { method: 'POST', body: JSON.stringify(body) });
    btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save');
    if (result) {
      closeCampaignModal();
      showToast(editingCampaignId ? t('campaignUpdated') : t('campaignCreated'), 'success');
      const pid = campaignProgramContext.programId || currentProgramId;
      if (pid) showProgramDetails(pid);
    }
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
    const btn = document.getElementById('campaignFormSubmit');
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('save'); }
  }
}
function openDeleteModal(type, id, name) { deleteContext = { type, id, name }; document.getElementById('deleteProgramName').textContent = name || ''; document.getElementById('deleteModal').classList.add('show'); document.body.classList.add('modal-open'); }
function closeDeleteModal() { document.getElementById('deleteModal').classList.remove('show'); document.body.classList.remove('modal-open'); deleteContext = { type: null, id: null, name: '' }; }

async function confirmDelete() {
  const { type, id } = deleteContext;
  if (!type || !id) return;
  const btn = document.getElementById('deleteConfirm');
  btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spinner"></span>';
  const result = await apiFetch((type === 'program' ? '/programs/' : '/campaigns/') + id, { method: 'DELETE' });
  btn.disabled = false; btn.classList.remove('loading'); btn.textContent = t('delete');
  if (result) {
    closeDeleteModal();
    if (type === 'campaign' && campaignProgramContext.programId) showProgramDetails(campaignProgramContext.programId);
    else if (type === 'program') loadPrograms();
    showToast(t(type + 'Deleted') || 'Deleted', 'success');
  }
}

function openCustomerViewModal(customerId) {
  apiFetch('/customers/' + customerId).then(data => {
    if (!data || !data.customer) return;
    const cust = data.customer; const st = cust.status || 'potential'; const ps = cust.payment?.status || 'notPaid';
    const content = '<div style="display:flex;flex-direction:column;gap:16px">' +
      '<div style="display:flex;align-items:center;gap:12px"><div style="width:48px;height:48px;border-radius:50%;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">' + cust.name.charAt(0).toUpperCase() + '</div><div><div style="font-size:18px;font-weight:700;color:var(--text-primary)">' + cust.name + '</div><span class="customer-status-badge ' + st + '">' + t(st) + '</span></div></div>' +
      '<div class="campaign-info-brief">' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">📱 ' + t('phone') + '</span><span class="campaign-info-brief-value">' + (cust.phone || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">💬 ' + t('whatsapp') + '</span><span class="campaign-info-brief-value">' + (cust.whatsapp || cust.phone || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">✉️ ' + t('email') + '</span><span class="campaign-info-brief-value">' + (cust.email || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">📍 ' + t('address') + '</span><span class="campaign-info-brief-value">' + (cust.address || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">📚 ' + t('program') + '</span><span class="campaign-info-brief-value">' + (cust.program || '\u2014') + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">👤 ' + t('assignedEmployee') + '</span><span class="campaign-info-brief-value">' + (cust.assignedEmployee?.name || t('none')) + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">📅 ' + t('registrationDate') + '</span><span class="campaign-info-brief-value">' + formatDate(cust.registrationDate) + '</span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">💰 ' + t('paymentStatus') + '</span><span class="campaign-info-brief-value"><span class="payment-status-badge ' + ps + '">' + t(ps) + '</span></span></div>' +
      '<div class="campaign-info-brief-item"><span class="campaign-info-brief-label">💵 ' + t('paidAmount') + '</span><span class="campaign-info-brief-value">' + formatCurrency(cust.payment?.paidAmount) + (cust.payment?.finalPrice ? ' / ' + formatCurrency(cust.payment.finalPrice) : '') + '</span></div></div>' +
      (cust.notes ? '<div style="padding:12px;background:var(--bg-secondary);border-radius:10px;font-size:13px;color:var(--text-secondary);line-height:1.6">📝 ' + cust.notes + '</div>' : '') + '</div>';
    openInfoModal(cust.name, content);
  });
}

function openCustomerEditModal(customerId) {
  editingCustomerId = customerId;
  apiFetch('/customers/' + customerId).then(data => {
    if (!data || !data.customer) return;
    const cust = data.customer;
    document.getElementById('custFormName').value = cust.name || '';
    document.getElementById('custFormPhone').value = cust.phone || '';
    document.getElementById('custFormWhatsapp').value = cust.whatsapp || '';
    document.getElementById('custFormEmail').value = cust.email || '';
    document.getElementById('custFormAddress').value = cust.address || '';
    document.getElementById('custFormProgram').value = cust.program || '';
    document.getElementById('custFormEmployee').value = cust.assignedEmployee?._id || cust.assignedEmployee || '';
    document.getElementById('custFormDate').value = cust.registrationDate ? cust.registrationDate.split('T')[0] : '';
    document.getElementById('custFormStatus').value = cust.status || 'potential';
    document.getElementById('custFormNotes').value = cust.notes || '';
    const isSubscribed = (cust.status || 'potential') === 'subscribed';
    document.getElementById('custFormPaymentSection').style.display = isSubscribed ? '' : 'none';
    document.getElementById('custFormPayAmount').value = cust.payment?.paidAmount || '';
    document.getElementById('custFormPayMethod').value = cust.payment?.paymentMethod || 'cash';
    document.getElementById('custFormPayNotes').value = '';
    const prog = (allPrograms || []).find(x => x._id === (cust.programRef?._id || cust.programRef)) || (allPrograms || []).find(x => x.name === cust.program);
    const priceWrap = document.getElementById('custFormProgramPriceWrap');
    const priceEl = document.getElementById('custFormProgramPrice');
    if (isSubscribed && prog && prog.price !== undefined && prog.price > 0) {
      if (priceEl) priceEl.innerHTML = priceDisplay('', prog.price, { size: 'lg', color: 'gold' });
      if (priceWrap) priceWrap.style.display = '';
    } else if (priceWrap) {
      priceWrap.style.display = 'none';
    }
    campaignCustomerContext = { campaignId: currentCampaignId || null, programId: currentProgramId || null, programName: cust.program };
    document.getElementById('customerModalTitle').textContent = t('editCustomer');
    document.getElementById('customerModal').classList.add('show');
    document.body.classList.add('modal-open');
    populateEmployeeDropdown();
    const statusSelect = document.getElementById('custFormStatus');
    const togglePaySection = function() {
      document.getElementById('custFormPaymentSection').style.display = this.value === 'subscribed' ? '' : 'none';
    };
    statusSelect.removeEventListener('change', togglePaySection);
    statusSelect.addEventListener('change', togglePaySection);
  });
}

function openInfoModal(title, content) {
  const existing = document.getElementById('infoModalOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'infoModalOverlay';
  overlay.innerHTML = '<div class="modal-container modal-premium"><div class="modal-premium-header"><div class="modal-premium-header-left"><div style="width:44px;height:44px;border-radius:12px;background:rgba(201,168,76,0.12);display:flex;align-items:center;justify-content:center;font-size:20px">👤</div><div><h2 style="margin:0;font-size:18px">' + title + '</h2></div></div><button class="modal-premium-close" id="infoModalClose">✕</button></div><div class="modal-premium-body" style="padding:24px 28px">' + content + '</div></div>';
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  document.getElementById('infoModalClose').addEventListener('click', function() { overlay.remove(); document.body.classList.remove('modal-open'); });
  overlay.addEventListener('click', function(e) { if (e.target === this) { overlay.remove(); document.body.classList.remove('modal-open'); } });
}
function initPrograms() {
  const token = getToken(); const user = getUser();
  if (!token || !user) { redirectToLogin(); return; }
  initI18n('programs', 'programs');
  initTheme();
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', function() { const p = this.dataset.nav; if (p) window.location.href = p + '.html'; });
  });
  const ham = document.getElementById('hamburger'); const sb = document.getElementById('sidebar'); const bd = document.getElementById('sidebarBackdrop');
  if (ham && sb && bd) { const toggle = () => { sb.classList.toggle('open'); bd.classList.toggle('show'); }; ham.addEventListener('click', toggle); bd.addEventListener('click', toggle); }
  document.getElementById('langToggle2')?.addEventListener('click', switchLang);
  window.updateLangToggle = function() { const btn = document.getElementById('langToggle2'); if (btn) { const s = i18n[currentLang]?.programs || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang]; btn.innerHTML = '<span class=\"icon\">🌐</span> ' + (s.langSwitch || ''); } };
  window.updateThemeToggle = function() {
    const btn = document.getElementById('themeToggle2'); if (!btn) return;
    const theme = getTheme(); const s = i18n[currentLang]?.programs || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    btn.innerHTML = theme === 'dark' ? '<span class=\"icon\">☀️</span> ' + (s?.themeLight || 'Light') : '<span class=\"icon\">🌙</span> ' + (s?.themeDark || 'Dark');
  };
  document.getElementById('themeToggle2')?.addEventListener('click', toggleTheme);
  document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.removeItem('alkayan_token'); sessionStorage.removeItem('alkayan_token'); localStorage.removeItem('alkayan_user'); redirectToLogin(); });
  updateLangToggle(); updateThemeToggle();
  if (!can('programs', 'add')) { const b = document.getElementById('addProgramBtn'); if (b) b.style.display = 'none'; }
  document.getElementById('addProgramBtn').addEventListener('click', openAddModal);
  document.getElementById('importProgramsBtn')?.addEventListener('click', function() { try { window.location.href = 'customers-import.html?collection=programs'; } catch { openComingSoon(t('importComingSoon')); } });
  document.getElementById('exportProgramsBtn')?.addEventListener('click', openExportModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('formCancel').addEventListener('click', closeModal);
  document.getElementById('programModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
  document.getElementById('programForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('formName').addEventListener('input', function() { this.style.borderColor = ''; });
  document.getElementById('customerModalClose').addEventListener('click', closeCustomerModal);
  document.getElementById('customerFormCancel').addEventListener('click', closeCustomerModal);
  document.getElementById('customerModal').addEventListener('click', function(e) { if (e.target === this) closeCustomerModal(); });
  document.getElementById('customerForm').addEventListener('submit', handleCustomerFormSubmit);
  document.getElementById('custFormName').addEventListener('input', function() { this.style.borderColor = ''; });
  document.getElementById('custFormPhone').addEventListener('input', function() { this.style.borderColor = ''; });
  document.getElementById('campaignModalClose').addEventListener('click', closeCampaignModal);
  document.getElementById('campaignFormCancel').addEventListener('click', closeCampaignModal);
  document.getElementById('campaignModal').addEventListener('click', function(e) { if (e.target === this) closeCampaignModal(); });
  document.getElementById('campaignForm').addEventListener('submit', handleCampaignFormSubmit);
  document.getElementById('campFormName').addEventListener('input', function() { this.style.borderColor = ''; });
  document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancel').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirm').addEventListener('click', confirmDelete);
  document.getElementById('deleteModal').addEventListener('click', function(e) { if (e.target === this) closeDeleteModal(); });
  document.getElementById('backToListBtn').addEventListener('click', hideProgramDetails);
  document.getElementById('backToProgramBtn').addEventListener('click', hideCampaignDetails);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('exportModalClose').addEventListener('click', closeExportModal);
  document.getElementById('exportModalCancel').addEventListener('click', closeExportModal);
  document.getElementById('exportModal').addEventListener('click', function(e) { if (e.target === this) closeExportModal(); });
  document.getElementById('exportCsvBtn').addEventListener('click', function() { closeExportModal(); exportPrograms(); });
  document.getElementById('exportExcelBtn').addEventListener('click', function() { closeExportModal(); openComingSoon(t('excelComingSoon')); });
  document.getElementById('exportPdfBtn').addEventListener('click', function() { closeExportModal(); openComingSoon(t('pdfComingSoon')); });
  document.getElementById('comingSoonClose').addEventListener('click', closeComingSoon);
  document.getElementById('comingSoonModal').addEventListener('click', function(e) { if (e.target === this) closeComingSoon(); });
  document.getElementById('retryBtn').addEventListener('click', loadPrograms);
  document.getElementById('emptyAddProgramBtn')?.addEventListener('click', openAddModal);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeDeleteModal(); closeCampaignModal(); closeModal(); closeCustomerModal(); closePaymentModal(); } });

  document.getElementById('detailsContent').addEventListener('click', function(e) {
    const t = e.target.closest('#detailsEditBtn,#detailsDeleteBtn,#addCustFromProgramBtn,#addCampaignFromProgramBtn,[data-campaign-view],[data-campaign-edit],[data-campaign-delete],[data-cust-view],[data-cust-edit]');
    if (!t) return;
    e.stopPropagation();
    if (t.id === 'detailsEditBtn') { hideProgramDetails(); openEditModal(currentProgramId); return; }
    if (t.id === 'detailsDeleteBtn') { const pr = allPrograms.find(x => x._id === currentProgramId); openDeleteModal('program', currentProgramId, pr ? pr.name : ''); return; }
    if (t.id === 'addCustFromProgramBtn') { openAddCustomerFromCampaign(null, currentProgramName); return; }
    if (t.id === 'addCampaignFromProgramBtn') { openAddCampaign(currentProgramId, currentProgramName); return; }
    if (t.dataset.campaignView) { showCampaignDetails(t.dataset.campaignView, currentProgramId); return; }
    if (t.dataset.campaignEdit) { openEditCampaign(t.dataset.campaignEdit); return; }
    if (t.dataset.campaignDelete) { const parent = t.closest('.campaign-detail-card'); const nm = parent?.querySelector('.campaign-detail-card-name')?.textContent?.replace('\uD83D\uDCE2 ', '') || ''; openDeleteModal('campaign', t.dataset.campaignDelete, nm); return; }
    if (t.dataset.custView) { openCustomerViewModal(t.dataset.custView); return; }
    if (t.dataset.custEdit) { currentCampaignId = null; openCustomerEditModal(t.dataset.custEdit); }
  });
  document.getElementById('campaignDetailsContent').addEventListener('click', function(e) {
    const t = e.target.closest('#addCustomerFromCampaignBtn,[data-cust-view],[data-cust-edit],[data-cust-remove],[data-cust-pay]');
    if (!t) return;
    if (t.id === 'addCustomerFromCampaignBtn') { openAddCustomerFromCampaign(currentCampaignId, currentProgramName); return; }
    if (t.dataset.custView) { openCustomerViewModal(t.dataset.custView); return; }
    if (t.dataset.custEdit) { openCustomerEditModal(t.dataset.custEdit); return; }
    if (t.dataset.custPay) { openPaymentModal(t.dataset.custPay); return; }
    if (t.dataset.custRemove && confirm('Remove ' + t.dataset.custName + ' from campaign?')) removeCustomerFromCampaign(currentCampaignId, t.dataset.custRemove);
  });
  document.getElementById('payModalClose').addEventListener('click', closePaymentModal);
  document.getElementById('payFormCancel').addEventListener('click', closePaymentModal);
  document.getElementById('paymentModal').addEventListener('click', function(e) { if (e.target === this) closePaymentModal(); });
  document.getElementById('payForm').addEventListener('submit', handlePaymentFormSubmit);
  document.getElementById('payFormAmount').addEventListener('input', function() { this.style.borderColor = ''; });
  loadPrograms();
}

document.addEventListener('DOMContentLoaded', initPrograms);
