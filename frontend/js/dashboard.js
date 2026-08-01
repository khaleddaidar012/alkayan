const API_URL = 'http://localhost:5000/api';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('alkayan_user'));
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('alkayan_token') || sessionStorage.getItem('alkayan_token');
}

function redirectToLogin() {
  window.location.href = 'login.html';
}

function updateWelcomeText(user) {
  const welcomeEl = document.querySelector('.welcome-text');
  if (!welcomeEl) return;
  const section = i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
  const greeting = section.welcome || 'Welcome back';
  welcomeEl.textContent = `${greeting}, ${user.name}`;
}

function initDashboard() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    redirectToLogin();
    return;
  }

  initI18n('dashboard', 'dashboard');
  initTheme();

  // Set user info
  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');

  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;

  // Apply user preferences (only set language when the user has no saved preference yet)
  if (user.lang && (user.lang === 'ar' || user.lang === 'en') && !localStorage.getItem('alkayan_lang')) {
    currentLang = user.lang;
    localStorage.setItem('alkayan_lang', currentLang);
    setDirection(currentLang);
    updateLangToggle();
    applyTranslation('dashboard', 'dashboard');
  }
  if (user.theme) {
    setTheme(user.theme);
  }

  updateWelcomeText(user);

  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', function () {
      const page = this.dataset.nav;
      if (page) window.location.href = `${page}.html`;
    });
  });

  // Hamburger menu
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

  // Lang toggle - dynamic without reload
  const langBtn = document.getElementById('langToggle2');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      switchLang();
      updateWelcomeText(user);
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle2');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('alkayan_token');
      sessionStorage.removeItem('alkayan_token');
      localStorage.removeItem('alkayan_user');
      redirectToLogin();
    });
  }

  // Override langToggle update for dashboard
  window.updateLangToggle = function () {
    const btn = document.getElementById('langToggle2');
    if (btn) {
      const section = i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
      btn.innerHTML = `<span class="icon">🌐</span> ${section.langSwitch || ''}`;
    }
  };

  window.updateThemeToggle = function () {
    const btn = document.getElementById('themeToggle2');
    if (!btn) return;
    const theme = getTheme();
    const section = i18n[currentLang]?.dashboard || i18n[currentLang]?.login || i18n[currentLang];
    if (theme === 'dark') {
      btn.innerHTML = `<span class="icon">☀️</span> ${section?.themeLight || 'Light'}`;
    } else {
      btn.innerHTML = `<span class="icon">🌙</span> ${section?.themeDark || 'Dark'}`;
    }
  };

  updateLangToggle();
  updateThemeToggle();

  fetchStats();
}

async function fetchStats() {
  const token = getToken();
  if (!token) return;

  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    const [coursesRes, customersRes, usersRes, tasksRes] = await Promise.all([
      fetch(`${API_URL}/courses`, { headers }).catch(() => null),
      fetch(`${API_URL}/customers`, { headers }).catch(() => null),
      fetch(`${API_URL}/users`, { headers }).catch(() => null),
      fetch(`${API_URL}/tasks`, { headers }).catch(() => null)
    ]);

    if (coursesRes?.ok) {
      const data = await coursesRes.json();
      document.getElementById('statCourses').textContent = data.count ?? data.length ?? '—';
    }
    if (customersRes?.ok) {
      const data = await customersRes.json();
      document.getElementById('statCustomers').textContent = data.count ?? data.length ?? '—';
    }
    if (usersRes?.ok) {
      const data = await usersRes.json();
      document.getElementById('statUsers').textContent = data.count ?? data.length ?? '—';
    }
    if (tasksRes?.ok) {
      const data = await tasksRes.json();
      document.getElementById('statTasks').textContent = data.count ?? data.length ?? '—';
    }
  } catch (err) {
    console.log('Stats fetch deferred — backend may not be running');
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
