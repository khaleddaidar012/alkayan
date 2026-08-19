(function () {
  'use strict';

  function currentPageName() {
    const parts = window.location.pathname.split('/');
    const file = parts[parts.length - 1] || '';
    return file.replace(/\.html$/, '') || 'dashboard';
  }

  function buildBottomNav() {
    if (document.querySelector('.mobile-bottom-nav')) return;

    const items = [
      { nav: 'dashboard', icon: '📊', key: 'dashboard' },
      { nav: 'customers', icon: '👥', key: 'customers' },
      { nav: 'programs', icon: '📚', key: 'programs' },
      { nav: 'tasks', icon: '✅', key: 'tasks' },
      { nav: 'reports', icon: '📈', key: 'reports' }
    ];

    const current = currentPageName();

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Primary');

    items.forEach(function (item) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mnav-item' + (item.nav === current ? ' active' : '');
      btn.dataset.nav = item.nav;

      const icon = document.createElement('span');
      icon.className = 'mnav-icon';
      icon.textContent = item.icon;

      const label = document.createElement('span');
      label.dataset.i18n = item.key;
      label.textContent = item.key;

      btn.appendChild(icon);
      btn.appendChild(label);
      nav.appendChild(btn);
    });

    nav.addEventListener('click', function (e) {
      const item = e.target.closest('.mnav-item');
      if (item && item.dataset.nav) {
        window.location.href = item.dataset.nav + '.html';
      }
    });

    document.body.appendChild(nav);

    if (typeof applyTranslation === 'function') {
      applyTranslation(currentPage || 'dashboard', currentSection || 'dashboard');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBottomNav);
  } else {
    buildBottomNav();
  }
})();