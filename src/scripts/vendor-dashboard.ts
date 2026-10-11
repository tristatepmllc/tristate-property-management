/**
 * Dashboard sidebar -> panel switching, shared by the vendor and client
 * dashboards (both use the .vdash shell). No routing, no scroll-jump: a
 * click on any [data-panel-link] hides every [data-panel] and shows only
 * the matching one.
 *
 * - The sidebar item for the target panel gets .is-active, whichever
 *   element was clicked (a stat card or "+ New request" button can open a
 *   panel too, without stealing the active state).
 * - Subtitle comes from the panel's own data-subtitle, falling back to the
 *   vendor map below.
 * - A URL hash (/portal/#jobs) opens that panel on load, so links back from
 *   a job page land in the right place.
 * - Silent no-op on pages with no [data-panel] (admin flat dashboard).
 */
function init(): void {
  const panels = document.querySelectorAll<HTMLElement>('[data-panel]');
  if (panels.length === 0) return;

  const triggers = document.querySelectorAll<HTMLElement>('[data-panel-link]');
  const sideItems = document.querySelectorAll<HTMLElement>('.vdash-side [data-panel-link]');
  const subtitle = document.getElementById('vdash-panel-subtitle');
  const vendorSubtitles: Record<string, string> = {
    dashboard: "Here's where your account stands today.",
    profile: 'Update your contact and trade details.',
    settings: 'Account email and password.',
    jobs: 'Full history of jobs on your account.',
    invoices: 'Submit and track invoices for completed jobs.',
  };

  const show = (target: string): boolean => {
    const found = Array.from(panels).find((p) => p.dataset.panel === target);
    if (!found) return false;
    panels.forEach((panel) => {
      const match = panel === found;
      panel.hidden = !match;
      panel.classList.toggle('is-active', match);
    });
    sideItems.forEach((l) => l.classList.toggle('is-active', l.dataset.panelLink === target));
    const text = found.dataset.subtitle ?? vendorSubtitles[target];
    if (subtitle && text) subtitle.textContent = text;
    return true;
  };

  triggers.forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.dataset.panelLink;
      if (!target || !show(target)) return;
      if (history.replaceState) history.replaceState(null, '', `#${target}`);
      const tab = link.dataset.jobsTab;
      if (tab) document.dispatchEvent(new CustomEvent('cdash:jobs-tab', { detail: tab }));
      const main = document.querySelector('.vdash-main');
      if (main && main.getBoundingClientRect().top < 0) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const fromHash = location.hash.replace('#', '');
  if (fromHash) show(fromHash);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
