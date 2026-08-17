const CURRENCIES = {
  EGP: { code: 'EGP', symbol: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', flag: '🇪🇬' },
  SAR: { code: 'SAR', symbol: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', flag: '🇸🇦' },
  OMR: { code: 'OMR', symbol: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial', flag: '🇴🇲' },
  LYD: { code: 'LYD', symbol: 'LYD', nameAr: 'دينار ليبي', nameEn: 'Libyan Dinar', flag: '🇱🇾' },
  USD: { code: 'USD', symbol: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', flag: '🌍' }
};

const PRICING_KEYS = ['egypt', 'saudi_arabia', 'oman', 'libya', 'usd_fallback'];

let cachedPrices = null;

const priceFieldMap = {
  egypt: 'egypt_price',
  saudi_arabia: 'saudi_arabia_price',
  oman: 'oman_price',
  libya: 'libya_price'
};

function currencyForCountry(country) {
  const map = { egypt: 'EGP', saudi_arabia: 'SAR', oman: 'OMR', libya: 'LYD' };
  return map[country] || 'USD';
}

function getPriceForCountry(country, priceObj) {
  const prices = priceObj || cachedPrices;
  const field = priceFieldMap[country];
  if (field) {
    return { amount: Number(prices && prices[field]) || 0, currency: currencyForCountry(country) };
  }
  const usd = prices ? (prices.usd_fallback_price !== undefined ? prices.usd_fallback_price : prices.usd_fallback?.amount) : 0;
  return { amount: Number(usd) || 0, currency: 'USD' };
}

function formatCurrencyAmount(amount, currency, lang) {
  const n = Number(amount) || 0;
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const formatted = n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}

function formatPriceForCountry(country, priceObj, lang) {
  const p = getPriceForCountry(country, priceObj);
  return formatCurrencyAmount(p.amount, p.currency, lang);
}

async function fetchPrices() {
  const res = await fetch(`${API_URL || 'http://localhost:5000/api'}/settings/prices`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.prices) return null;
  const flat = {};
  flat.egypt_price = data.prices.egypt?.amount ?? 0;
  flat.saudi_arabia_price = data.prices.saudi_arabia?.amount ?? 0;
  flat.oman_price = data.prices.oman?.amount ?? 0;
  flat.libya_price = data.prices.libya?.amount ?? 0;
  flat.usd_fallback_price = data.prices.usd_fallback?.amount ?? 0;
  cachedPrices = flat;
  return flat;
}

function currencyInfoForCountry(country) {
  return CURRENCIES[currencyForCountry(country)] || CURRENCIES.USD;
}