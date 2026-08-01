const API_URL = 'http://localhost:5000/api';

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 4 + 's';
    p.style.animationDuration = (3 + Math.random() * 3) + 's';
    p.style.width = (2 + Math.random() * 3) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (!el) return;
  const msgEl = el.querySelector('.error-text');
  if (msgEl) msgEl.textContent = msg;
  el.classList.add('show');
}

function hideError() {
  const el = document.getElementById('errorMsg');
  if (el) el.classList.remove('show');
}

function setLoading(loading) {
  const btn = document.getElementById('loginBtn');
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember')?.checked || false;

  if (!email || !password) {
    showError(i18n[currentLang].login.errorRequired);
    return;
  }

  setLoading(true);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || i18n[currentLang].login.errorInvalid);
      setLoading(false);
      return;
    }

    if (remember) {
      localStorage.setItem('alkayan_token', data.token);
    } else {
      sessionStorage.setItem('alkayan_token', data.token);
    }

    localStorage.setItem('alkayan_user', JSON.stringify(data.user));

    if (data.user.theme) {
      setTheme(data.user.theme);
    }
    if (data.user.lang && (data.user.lang === 'ar' || data.user.lang === 'en')) {
      currentLang = data.user.lang;
      localStorage.setItem('alkayan_lang', currentLang);
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    showError(i18n[currentLang].login.errorServer);
    setLoading(false);
  }
}

function initLogin() {
  createParticles();
  initI18n('login', 'login');
  initTheme();

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', switchLang);
  }

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  const inputs = document.querySelectorAll('.input-group input');
  inputs.forEach(input => {
    input.addEventListener('focus', function () {
      this.closest('.input-group').classList.add('focused');
    });
    input.addEventListener('blur', function () {
      this.closest('.input-group').classList.remove('focused');
    });
  });
}

document.addEventListener('DOMContentLoaded', initLogin);
