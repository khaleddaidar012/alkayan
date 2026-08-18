function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function buildSlider(messages) {
  const list = messages || [];
  const customer = [...list].reverse().find(m => m.sender_type === 'customer');
  const employee = [...list].reverse().find(m => m.sender_type === 'employee');
  const last = list.length ? list[list.length - 1] : null;
  return { customer: customer || null, employee: employee || null, last, count: list.length };
}

function truncate(text, max = 50) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

module.exports = { round2, buildSlider, truncate };