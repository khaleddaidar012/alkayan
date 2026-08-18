function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function calculateDebt(payments) {
  let total_in = 0;
  let total_out = 0;
  for (const p of payments || []) {
    if (!p) continue;
    const amount = Number(p.amount) || 0;
    if (p.direction === 'in') total_in += amount;
    else if (p.direction === 'out') total_out += amount;
  }
  total_in = round2(total_in);
  total_out = round2(total_out);
  return { total_in, total_out, balance: round2(total_in - total_out) };
}

function hasDebt(payments) {
  const { balance } = calculateDebt(payments);
  return balance > 0;
}

function debtStatus(payments) {
  const { balance } = calculateDebt(payments);
  if (balance > 0) return 'has_debt';
  if (balance < 0) return 'overpaid';
  return 'settled';
}

module.exports = { calculateDebt, hasDebt, debtStatus, round2 };