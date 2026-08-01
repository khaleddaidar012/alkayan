function getTheme() {
  return localStorage.getItem('alkayan_theme') || 'dark';
}

function setTheme(theme) {
  localStorage.setItem('alkayan_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeToggle();
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function updateThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const theme = getTheme();
  const lang = localStorage.getItem('alkayan_lang') || 'ar';
  if (theme === 'dark') {
    btn.innerHTML = `<span class="icon">☀️</span> ${i18n[lang]?.login?.themeLight || 'Light'}`;
  } else {
    btn.innerHTML = `<span class="icon">🌙</span> ${i18n[lang]?.login?.themeDark || 'Dark'}`;
  }
}

function initTheme() {
  const saved = getTheme();
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeToggle();
}

document.addEventListener('DOMContentLoaded', initTheme);
