/**
 * Header dropdown behaviour.
 *
 * The burger itself stays CSS-only (the checkbox in Header.astro) - that part
 * works with JavaScript disabled and is not touched here. This file only adds
 * the three dropdowns.
 *
 * Design notes:
 * - Click/tap toggles. Hover only *opens*, and only for a fine pointer, so a
 *   touch device never gets a menu that opens on scroll-past.
 * - Closing on hover-out uses a short delay, because the gap between a control
 *   and its panel is a real pixel gap and crossing it must not close the menu.
 * - With no JavaScript, every panel stays `hidden` and the header degrades to
 *   the five nav links plus the phone number. Nothing inside a panel is the
 *   only route to a page: /contact/, /client-registration/ and /vendor-network/
 *   are all reachable from the footer and /sitemap/.
 */
const CLOSE_DELAY = 180;

type Drop = {
  root: HTMLElement;
  btn: HTMLButtonElement;
  panel: HTMLElement;
};

const drops: Drop[] = [];

document.querySelectorAll<HTMLElement>('[data-drop]').forEach((root) => {
  const btn = root.querySelector<HTMLButtonElement>('.drop-btn');
  const id = btn?.getAttribute('aria-controls');
  const panel = id ? document.getElementById(id) : null;
  if (btn && panel) drops.push({ root, btn, panel });
});

if (drops.length) {
  let timer: number | undefined;

  const setOpen = (d: Drop, open: boolean) => {
    d.btn.setAttribute('aria-expanded', String(open));
    d.panel.hidden = !open;
    d.root.classList.toggle('is-open', open);
  };

  const closeAll = (except?: Drop) => {
    for (const d of drops) if (d !== except) setOpen(d, false);
  };

  const fine = () => window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  for (const d of drops) {
    // On a mouse, moving onto the control already opened the panel, so the
    // click that follows would immediately close it again - the menu would
    // never appear to open at all. This flag lets the first click after a
    // hover-open be absorbed; the second one closes, as expected.
    let openedByHover = false;

    d.btn.addEventListener('click', () => {
      const open = d.btn.getAttribute('aria-expanded') === 'true';
      if (open && openedByHover) {
        openedByHover = false;
        return;
      }
      openedByHover = false;
      closeAll(d);
      setOpen(d, !open);
    });

    // Hover opens on desktop only, and never closes another menu abruptly.
    d.root.addEventListener('pointerenter', (e) => {
      if (!fine() || (e as PointerEvent).pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      if (d.btn.getAttribute('aria-expanded') !== 'true') openedByHover = true;
      closeAll(d);
      setOpen(d, true);
    });

    d.root.addEventListener('pointerleave', (e) => {
      if (!fine() || (e as PointerEvent).pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      openedByHover = false;
      timer = window.setTimeout(() => setOpen(d, false), CLOSE_DELAY);
    });

    // Tabbing out of the whole group closes it; tabbing within does not.
    d.root.addEventListener('focusout', (e) => {
      const next = (e as FocusEvent).relatedTarget as Node | null;
      if (!next || !d.root.contains(next)) setOpen(d, false);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = drops.find((d) => d.btn.getAttribute('aria-expanded') === 'true');
    if (!open) return;
    setOpen(open, false);
    open.btn.focus();
  });

  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (!drops.some((d) => d.root.contains(t))) closeAll();
  });

  // Collapsing the burger must not leave an accordion panel open behind it.
  document.getElementById('nav-toggle')?.addEventListener('change', () => closeAll());
}

export {};
