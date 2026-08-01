const API_URL = 'http://localhost:5000/api';

let currentStep = 1;
let selectedSource = null;
let importedColumns = [];
let importedRows = [];
let fieldMappings = {};
let crmFields = [];
let importResults = null;

const urlParams = new URLSearchParams(window.location.search);
const importCollection = urlParams.get('collection') || 'customers';

function getUser() {
  try { return JSON.parse(localStorage.getItem('alkayan_user')); }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

function redirectToLogin() { window.location.href = 'login.html'; }

function t(key) {
  const section = i18n[currentLang]?.importWizard || i18n[currentLang]?.nav || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
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

function $(id) { return document.getElementById(id); }

// ---- API ----
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
      if (res.status === 401) { localStorage.removeItem('alkayan_token'); sessionStorage.removeItem('alkayan_token'); localStorage.removeItem('alkayan_user'); redirectToLogin(); return null; }
      showToast(data.message || 'Request failed', 'error');
      return null;
    }
    return data;
  } catch (err) {
    showToast('Server connection failed', 'error');
    return null;
  }
}

// ---- Step Navigation ----
function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.stepper-step').forEach(el => {
    el.classList.remove('active');
    const s = parseInt(el.dataset.step);
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('done');
  });
  const target = $(`step${step}`);
  if (target) target.classList.add('active');
}

function nextStep() { goToStep(currentStep + 1); }
function prevStep() { goToStep(currentStep - 1); }

// ---- Source Selection ----
function initSourceCards() {
  document.querySelectorAll('.source-card').forEach(card => {
    card.addEventListener('click', function () {
      document.querySelectorAll('.source-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      selectedSource = this.dataset.source;

      document.querySelectorAll('.source-input-area').forEach(el => el.style.display = 'none');
      if (selectedSource === 'google') $('googleInput').style.display = 'block';
      else if (selectedSource === 'excel' || selectedSource === 'csv') $('fileInput').style.display = 'block';

      const accept = selectedSource === 'excel' ? '.xlsx,.xls' : '.csv';
      $('filePicker').accept = accept;

      $('step1Next').disabled = false;
    });
  });
}

// ---- Google Sheets ----
$('fetchGoogleBtn').addEventListener('click', async function () {
  const url = $('googleSheetUrl').value.trim();
  if (!url || !url.includes('docs.google.com/spreadsheets')) {
    showToast('Invalid Google Sheets URL', 'error');
    return;
  }
  this.disabled = true;
  this.textContent = '...';
  try {
    const csvUrl = url.replace(/\/edit.*$/, '') + '/export?format=csv';
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error('Cannot fetch sheet');
    const csvText = await res.text();
    parseCsvData(csvText);
    nextStep();
    buildMappingUI();
  } catch (err) {
    showToast('Failed to fetch Google Sheet. Make sure it is publicly accessible.', 'error');
  }
  this.disabled = false;
  this.textContent = t('fetchSheet');
});

// ---- File Upload ----
$('browseBtn').addEventListener('click', () => $('filePicker').click());

$('filePicker').addEventListener('change', function () {
  if (this.files.length) handleFile(this.files[0]);
});

const dropZone = $('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', () => $('filePicker').click());

$('fileRemove').addEventListener('click', function () {
  $('filePicker').value = '';
  $('fileInfo').style.display = 'none';
  $('dropZone').style.display = '';
  importedColumns = [];
  importedRows = [];
});

function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (selectedSource === 'excel' && ext !== 'xlsx' && ext !== 'xls') {
    showToast('Please select an Excel file (.xlsx)', 'error');
    return;
  }
  if (selectedSource === 'csv' && ext !== 'csv') {
    showToast('Please select a CSV file (.csv)', 'error');
    return;
  }

  $('fileName').textContent = file.name;
  $('fileInfo').style.display = 'flex';
  $('dropZone').style.display = 'none';

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      if (ext === 'csv') {
        parseCsvData(e.target.result);
      } else {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { showToast('File is empty', 'error'); return; }
        importedColumns = Object.keys(json[0]);
        importedRows = json;
      }
      nextStep();
      buildMappingUI();
      $('step1Next').disabled = true;
    } catch (err) {
      showToast('Failed to read file. Please check the format.', 'error');
    }
  };
  if (ext === 'csv') reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function parseCsvData(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) { showToast('File is empty', 'error'); return; }
  importedColumns = parseCsvLine(lines[0]);
  importedRows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length === 1 && !vals[0].trim()) continue;
    const row = {};
    importedColumns.forEach((col, idx) => { row[col] = vals[idx] || ''; });
    importedRows.push(row);
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

// ---- Step 2: Mapping ----
async function buildMappingUI() {
  const data = await apiFetch(`/import/fields/${importCollection}`);
  if (!data) return;
  crmFields = data.fields;

  const container = $('mappingRows');
  container.innerHTML = '';

  const ignoreOption = `<option value="_ignore">— ${t('ignoreColumn')} —</option>`;
  const fieldOptions = crmFields.map(f =>
    `<option value="${f.field}">${t(f.field + 'Label') || f.label}</option>`
  ).join('');

  importedColumns.forEach(col => {
    const matchingField = crmFields.find(f =>
      f.label.toLowerCase() === col.toLowerCase() ||
      f.field.toLowerCase() === col.toLowerCase()
    );

    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.innerHTML = `
      <span class="mapping-col-name">${col}</span>
      <span class="mapping-arrow">→</span>
      <select class="mapping-select" data-col="${col}">
        ${ignoreOption}
        ${fieldOptions}
      </select>
    `;
    container.appendChild(row);

    const select = row.querySelector('select');
    if (matchingField) select.value = matchingField.field;
    select.addEventListener('change', updateMappings);
  });

  updateMappings();
  goToStep(2);
}

function updateMappings() {
  fieldMappings = {};
  document.querySelectorAll('.mapping-select').forEach(sel => {
    fieldMappings[sel.dataset.col] = sel.value;
  });
}

// ---- Step 3: Preview ----
$('step2Next').addEventListener('click', function () {
  const mapped = Object.values(fieldMappings).filter(v => v !== '_ignore');
  if (!mapped.length) { showToast('Please map at least one column', 'error'); return; }
  buildPreview();
  nextStep();
});

function buildPreview() {
  const head = $('previewHead');
  const body = $('previewBody');
  const mappedCols = importedColumns.filter(c => fieldMappings[c] !== '_ignore');

  head.innerHTML = `<tr>${mappedCols.map(c => `<th>${c}</th>`).join('')}</tr>`;

  const displayRows = importedRows.slice(0, 20);
  body.innerHTML = displayRows.map((row, idx) => {
    const hasError = !row[importedColumns.find(c => {
      const field = fieldMappings[c];
      const cfg = crmFields.find(f => f.field === field);
      return cfg && cfg.required && (!row[c] || row[c].trim() === '');
    })];
    return `<tr class="${!hasError ? 'row-error' : ''}">${mappedCols.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>`;
  }).join('');

  const total = importedRows.length;
  const requiredFields = crmFields.filter(f => f.required).map(f => f.field);
  const mappedRequired = Object.entries(fieldMappings).filter(([, v]) => requiredFields.includes(v)).map(([k]) => k);

  let valid = 0, errors = 0, duplicates = 0;
  const keySet = new Set();

  importedRows.forEach(row => {
    const missing = mappedRequired.some(col => !row[col] || row[col].trim() === '');
    if (missing) { errors++; return; }
    const keyCol = Object.entries(fieldMappings).find(([, v]) => v === (importCollection === 'customers' ? 'phone' : 'name'));
    if (keyCol) {
      const key = String(row[keyCol[0]] || '').trim();
      if (keySet.has(key)) duplicates++;
      else keySet.add(key);
      if (importCollection === 'customers' && key && !/^[\d\s+\-()]{7,20}$/.test(key)) { errors++; return; }
    }
    valid++;
  });

  $('previewTotal').textContent = total;
  $('previewValid').textContent = valid;
  $('previewErrors').textContent = errors;
  $('previewDuplicates').textContent = duplicates;
}

// ---- Step 4: Import ----
$('step3Next').addEventListener('click', async function () {
  const btn = this;
  btn.disabled = true;
  btn.textContent = '...';
  nextStep();
  await runImport();
  btn.disabled = false;
  btn.textContent = t('startImport');
});

async function runImport() {
  const total = importedRows.length;

  const body = {
    collection: importCollection,
    mapping: fieldMappings,
    rows: importedRows,
    duplicateBehavior: $('duplicateBehavior').value,
    duplicateKey: importCollection === 'customers' ? 'phone' : 'name'
  };

  const res = await apiFetch('/import/customers', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (!res || !res.results) {
    showToast('Import failed', 'error');
    goToStep(3);
    return;
  }

  importResults = res.results;
  await animateProgress(importResults);
  showSummary();
}

async function animateProgress(results) {
  const total = results.total;
  const fill = $('progressFill');
  const bar = $('progressBar');
  const percentEl = $('progressPercent');
  const countEl = $('progressCount');

  const steps = 30;
  const stepDuration = 800 / steps;
  const processedCount = results.imported + results.skipped + results.updated + results.errors;

  for (let i = 0; i <= steps; i++) {
    const pct = Math.min((i / steps) * 100, 100);
    const currentCount = Math.round((i / steps) * processedCount);

    const circumference = 326.73;
    const offset = circumference - (pct / 100) * circumference;
    fill.style.strokeDashoffset = offset;
    bar.style.width = pct + '%';
    percentEl.textContent = Math.round(pct) + '%';
    countEl.textContent = `${currentCount} / ${total}`;

    await new Promise(r => setTimeout(r, stepDuration));
  }

  fill.style.strokeDashoffset = 0;
  bar.style.width = '100%';
  percentEl.textContent = '100%';
  countEl.textContent = `${processedCount} / ${total}`;
}

// ---- Step 5: Summary ----
function showSummary() {
  if (!importResults) return;
  $('summaryImported').textContent = importResults.imported || 0;
  $('summarySkipped').textContent = importResults.skipped || 0;
  $('summaryUpdated').textContent = importResults.updated || 0;
  $('summaryErrors').textContent = importResults.errors || 0;
  nextStep();
}

$('doneBtn').addEventListener('click', () => {
  window.location.href = 'customers.html';
});

// ---- Nav buttons ----
$('step1Next').addEventListener('click', nextStep);
$('step2Back').addEventListener('click', prevStep);
$('step3Back').addEventListener('click', prevStep);

// ---- Init ----
function initImportWizard() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) { redirectToLogin(); return; }

  initI18n('importWizard', 'importWizard');
  initTheme();

  $('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  $('userName').textContent = user.name;
  $('userRole').textContent = user.role;

  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', function () {
      const page = this.dataset.nav;
      if (page) window.location.href = `${page}.html`;
    });
  });

  const hamburger = $('hamburger');
  const sidebar = $('sidebar');
  const backdrop = $('sidebarBackdrop');
  if (hamburger && sidebar && backdrop) {
    const toggle = () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('show'); };
    hamburger.addEventListener('click', toggle);
    backdrop.addEventListener('click', toggle);
  }

  const langBtn = $('langToggle2');
  if (langBtn) langBtn.addEventListener('click', switchLang);

  window.updateLangToggle = function () {
    const btn = $('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.importWizard || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${section.langSwitch || ''}`;
    }
  };

  window.updateThemeToggle = function () {
    const btn = $('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const section = i18n[currentLang]?.importWizard || i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    btn.innerHTML = theme === 'dark'
      ? `<span class="icon">☀️</span> ${section?.themeLight || 'Light'}`
      : `<span class="icon">🌙</span> ${section?.themeDark || 'Dark'}`;
  };

  const themeBtn = $('themeToggle2');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const logoutBtn = $('logoutBtn');
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

  initSourceCards();
  goToStep(1);
}

document.addEventListener('DOMContentLoaded', initImportWizard);