const COUNTRIES = {
  egypt: { code: 'egypt', dialCode: '20', nameAr: 'مصر', nameEn: 'Egypt', currency: 'EGP', flag: '🇪🇬' },
  saudi_arabia: { code: 'saudi_arabia', dialCode: '966', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR', flag: '🇸🇦' },
  oman: { code: 'oman', dialCode: '968', nameAr: 'عُمان', nameEn: 'Oman', currency: 'OMR', flag: '🇴🇲' },
  libya: { code: 'libya', dialCode: '218', nameAr: 'ليبيا', nameEn: 'Libya', currency: 'LYD', flag: '🇱🇾' },
  other: { code: 'other', dialCode: null, nameAr: 'أخرى', nameEn: 'Other', currency: 'USD', flag: '🌍' }
};

const COUNTRY_KEYS = ['egypt', 'saudi_arabia', 'oman', 'libya', 'other'];

function normalizePhone(input) {
  if (input === undefined || input === null) return '';
  let s = String(input).trim();
  if (!s) return '';
  s = s.replace(/^00/, '+');
  s = s.replace(/[\s\-().]/g, '');
  if (/^\+/.test(s)) return s.slice(1).replace(/[^\d]/g, '');
  if (/^0/.test(s)) {
    if (/^01\d{9}$/.test(s)) return '20' + s.slice(1);
    if (/^05\d{8}$/.test(s)) return '966' + s.slice(1);
    if (/^09\d{7}$/.test(s)) return '968' + s.slice(1);
    if (/^09\d{8}$/.test(s)) return '218' + s.slice(1);
    if (s.length <= 11) return '20' + s.slice(1);
  }
  return s.replace(/[^\d]/g, '');
}

function detectCountryFromPhone(phoneNumber) {
  const digits = normalizePhone(phoneNumber);
  if (!digits) return 'other';
  for (const key of ['egypt', 'saudi_arabia', 'oman', 'libya']) {
    if (digits.startsWith(COUNTRIES[key].dialCode)) return key;
  }
  return 'other';
}

function countryDisplayName(country, lang) {
  const c = COUNTRIES[country] || COUNTRIES.other;
  return lang === 'ar' ? c.nameAr : c.nameEn;
}