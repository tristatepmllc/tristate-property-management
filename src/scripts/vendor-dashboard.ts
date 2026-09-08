/**
 * Vendor dashboard sidebar -> panel switching. No routing, no scroll-jump:
 * a click on a [data-panel-link] hides every [data-panel] and shows only
 * the one whose data-panel matches the button's data-panel-link, and
 * moves .is-active to the clicked nav item. Only runs anything if the
 * vendor shell is actually on the page (client/admin dashboards don't
 * have .vdash-side at all, so this is a silent no-op for them).
 */
function init(): void {
  const links = document.querySelectorAll<HTMLButtonElement>('[data-panel-link]');
  if (links.length === 0) return;

  const panels = document.querySelectorAll<HTMLElement>('[data-panel]');
  const subtitle = document.getElementById('vdash-panel-subtitle');
  const subtitleByPanel: Record<string, string> = {
    dashboard: "Here's where your account stands today.",
    profile: 'Update your contact and trade details.',
    settings: 'Account email and password.',
    jobs: 'Full history of jobs on your account.',
    invoices: 'Submit and track invoices for completed jobs.',
  };

  links.forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.dataset.panelLink;
      if (!target) return;

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== target;
      });
      links.forEach((l) => l.classList.toggle('is-active', l === link));
      if (subtitle && subtitleByPanel[target]) subtitle.textContent = subtitleByPanel[target];
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
