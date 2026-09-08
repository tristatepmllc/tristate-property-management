/**
 * Dashboard top-bar profile dropdown - open on click, close on outside
 * click or Escape. Only present on DashboardLayout pages (signed-in
 * views), so this is a no-op everywhere else.
 */
function initProfileMenu(): void {
  const trigger = document.querySelector<HTMLButtonElement>('[data-profile-trigger]');
  const dropdown = document.querySelector<HTMLElement>('[data-profile-dropdown]');
  if (!trigger || !dropdown) return;

  const close = () => {
    dropdown.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    dropdown.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.hidden) open();
    else close();
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target as Node) && e.target !== trigger) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) close();
  });
}

/**
 * Sidebar collapse - only rendered for vendor (see DashboardLayout's
 * `hasSidebar`), so `.vdash` is simply absent on client/admin pages and
 * this is a silent no-op there, same posture as scripts/vendor-dashboard.ts.
 * State lives in a CSS class on `.vdash`, not localStorage - resets on
 * reload by design for now, not an oversight, just not asked for.
 */
function initSidebarToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-sidebar-toggle]');
  const vdash = document.querySelector<HTMLElement>('.vdash');
  if (!toggle || !vdash) return;

  toggle.addEventListener('click', () => {
    const collapsed = vdash.classList.toggle('is-sidebar-hidden');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  });
}

function init(): void {
  initProfileMenu();
  initSidebarToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
