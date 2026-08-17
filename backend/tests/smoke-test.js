const BASE = 'http://localhost:5000/api';
let token = '';

async function api(path, method, body, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function main() {
  const login = await api('/auth/login', 'POST', { email: 'admin@alkayan.com', password: 'admin123' });
  token = login.data.token;
  console.log('LOGIN:', login.status, 'token ok');

  const body = { whatsapp_number: '01092919124', country: '', name_ar: 'خالد هشام', status: 'potential' };
  const created = await api('/customers', 'POST', body);
  console.log('CREATE:', created.status, created.data.message || 'ok');
  const c = created.data.customer;
  if (!c) return;
  console.log('  id=%s name=%s country=%s whatsapp_number=%s', c._id, c.name, c.country, c.whatsapp_number);

  const dup = await api('/customers', 'POST', body);
  console.log('DUP:', dup.status, dup.data.message);

  const updated = await api(`/customers/${c._id}`, 'PUT', { name_en: 'Khaled Hesham', status: 'thinking' });
  console.log('UPDATE:', updated.status, 'name_en=%s status=%s country=%s', updated.data.customer.name_en, updated.data.customer.status, updated.data.customer.country);

  const list = await api('/customers?country=egypt&search=خالد', 'GET');
  console.log('LIST(filter egypt+search):', list.status, 'count=', list.data.count);

  const none = await api('/customers', 'POST', { name: 'No Phone' });
  console.log('NO PHONE:', none.status, none.data.message);

  const del = await api(`/customers/${c._id}`, 'DELETE');
  console.log('DELETE:', del.status, del.data.message);
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });