/**
 * Dashboard top-bar profile dropdown - open on click, close on outside
 * click or Escape. Only present on DashboardLayout pages (signed-in
 * views), so this is a no-op everywhere else.
 */
function init(): void {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
