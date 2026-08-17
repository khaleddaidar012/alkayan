const CURRENCIES = {
  EGP: { code: 'EGP', symbol: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound' },
  SAR: { code: 'SAR', symbol: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  OMR: { code: 'OMR', symbol: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial' },
  LYD: { code: 'LYD', symbol: 'LYD', nameAr: 'دينار ليبي', nameEn: 'Libyan Dinar' },
  USD: { code: 'USD', symbol: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar' }
};

const PRICE_FIELD_MAP = {
  egypt: 'egypt_price',
  saudi_arabia: 'saudi_arabia_price',
  oman: 'oman_price',
  libya: 'libya_price'
};

function getPriceForCountry(priceDoc, country) {
  const field = PRICE_FIELD_MAP[country];
  if (field) {
    return { amount: Number(priceDoc?.[field]) || 0, currency: currencyForCountry(country) };
  }
  return { amount: Number(priceDoc?.usd_fallback_price) || 0, currency: 'USD' };
}

function currencyForCountry(country) {
  const currencyByCountry = {
    egypt: 'EGP',
    saudi_arabia: 'SAR',
    oman: 'OMR',
    libya: 'LYD'
  };
  return currencyByCountry[country] || 'USD';
}

function formatCurrencyAmount(amount, currency, lang) {
  const n = Number(amount) || 0;
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const formatted = n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}

module.exports = {
  CURRENCIES,
  getPriceForCountry,
  currencyForCountry,
  formatCurrencyAmount
};