(() => {
  const icons = {
    'badge-check': '<path d="M16 16l2 2 4-4"/><path d="M7.5 4.27 9 3l1.5 1.27 1.96-.37.91 1.78 1.98.12.12 1.98 1.78.91-.37 1.96L19 12l-1.27 1.5.37 1.96-1.78.91-.12 1.98-1.98.12-.91 1.78-1.96-.37L9 21l-1.5-1.27-1.96.37-.91-1.78-1.98-.12-.12-1.98-1.78-.91.37-1.96L1 12l1.27-1.5-.37-1.96 1.78-.91.12-1.98 1.98-.12.91-1.78z"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    boxes: '<path d="M2.97 7.27 12 12l9.03-4.73"/><path d="M12 22V12"/><path d="m7.5 4.27 9 4.73"/><path d="m16.5 4.27-9 4.73"/><path d="M3 7v10l9 5 9-5V7"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'clock-3': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5h4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    flag: '<path d="M4 21V5"/><path d="m4 5 6-2 6 2 4-2v10l-4 2-6-2-6 2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2.12 2.12 0 0 0-3 0L6 20"/>',
    'image-up': '<path d="M10.3 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="m14 3 0 12"/><path d="m10 7 4-4 4 4"/><path d="m21 15-3.5-3.5a2.12 2.12 0 0 0-3 0L9 17"/>',
    landmark: '<path d="m3 22 18 0"/><path d="m6 18 0-7"/><path d="m10 18 0-7"/><path d="m14 18 0-7"/><path d="m18 18 0-7"/><path d="m12 2 8 4H4z"/>',
    'layout-dashboard': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    'layout-grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    'layout-template': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    'list-tree': '<path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    'locate-fixed': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><circle cx="12" cy="12" r="8"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'log-out': '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8"/>',
    mailbox: '<path d="M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><path d="M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 13h6"/>',
    map: '<path d="M14 4v16"/><path d="M10 4v16"/><path d="m3 6 7-2 4 2 7-2v14l-7 2-4-2-7 2z"/>',
    'map-pinned': '<path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z"/><circle cx="12" cy="11" r="2.5"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.6"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M16 2l4 4"/><path d="M14 8l6-6"/><path d="M13 9l-1 4 4-1"/>',
    package: '<path d="m3 7 9 5 9-5"/><path d="M12 22V12"/><path d="M21 7v10l-9 5-9-5V7l9-5z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.25a2 2 0 0 1 2.11-.45c.83.33 1.71.56 2.61.68A2 2 0 0 1 22 16.92z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    'rotate-ccw': '<path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 3-4.9L3 8"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
    'ship-wheel': '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="8"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/>',
    shirt: '<path d="M20.38 3.46 16 2l-2 3h-4L8 2 3.62 3.46 2 8l4 2v10h12V10l4-2-1.62-4.54Z"/>',
    smartphone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    'square-pen': '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.37 2.63a2.12 2.12 0 1 1 3 3L12 15l-4 1 1-4Z"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01Z"/>',
    tag: '<path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    truck: '<path d="M10 17h4"/><path d="M14 5h4l3 4v8h-2"/><path d="M1 5h13v12H3a2 2 0 0 1-2-2Z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M2 7h20v10H2z"/><path d="M16 12h.01"/>',
    'wallet-cards': '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h12"/><path d="M7 14h1"/>',
    x: '<path d="m18 6-12 12"/><path d="m6 6 12 12"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01"/><path d="M18 12h.01"/>'
  };

  function svg(name, cls = '', style = '') {
    const inner = icons[name] || icons.x;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''}>${inner}</svg>`;
  }

  function replace(root = document) {
    root.querySelectorAll('[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      const cls = el.getAttribute('class') || '';
      const style = el.getAttribute('style') || '';
      const span = document.createElement('span');
      span.innerHTML = svg(name, cls, style);
      const node = span.firstChild;
      el.replaceWith(node);
    });
  }

  window.lucide = {
    createIcons(options = {}) {
      replace(options.root || document);
    }
  };
  window.renderIcon = svg;
})();
