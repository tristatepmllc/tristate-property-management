/**
 * Testimonial carousel.
 *
 * Built on native scroll-snap rather than a transform track, so touch swipe,
 * keyboard scrolling and the scrollbar all work for free and the cards stay in
 * normal document flow (they remain readable and crawlable with JS disabled —
 * the section degrades to a horizontally scrollable row).
 *
 * Autoplay advances one page every 6s, pauses on hover, focus and when the
 * section is off-screen, and never starts for users who ask for reduced motion.
 */

const INTERVAL_MS = 6000;

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-carousel]');
  if (!root) return;

  const track = root.querySelector<HTMLElement>('.quotes-track');
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const dotsWrap = root.querySelector<HTMLElement>('[data-carousel-dots]');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll<HTMLElement>('.quote'));
  if (slides.length < 2) {
    root.querySelector<HTMLElement>('.carousel-controls')?.setAttribute('hidden', '');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** How many cards fit in the viewport right now (1, 2 or 3). */
  const perView = (): number => {
    const slideWidth = slides[0]!.getBoundingClientRect().width;
    if (!slideWidth) return 1;
    return Math.max(1, Math.round(track.clientWidth / slideWidth));
  };

  const pageCount = (): number => Math.max(1, slides.length - perView() + 1);

  const currentIndex = (): number => {
    const slideWidth = slides[0]!.getBoundingClientRect().width;
    const gap = slides.length > 1 ? slides[1]!.offsetLeft - slides[0]!.offsetLeft - slideWidth : 0;
    return Math.round(track.scrollLeft / (slideWidth + gap));
  };

  const goTo = (index: number, smooth = true): void => {
    const target = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft - track.offsetLeft,
      behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto',
    });
  };

  const step = (delta: number): void => {
    const last = pageCount() - 1;
    let target = currentIndex() + delta;
    if (target > last) target = 0; // loop forward
    if (target < 0) target = last; // loop back
    goTo(target);
  };

  // ---- dots -----------------------------------------------------------------
  let dots: HTMLButtonElement[] = [];

  function buildDots(): void {
    if (!dotsWrap) return;
    dotsWrap.textContent = '';
    dots = Array.from({ length: pageCount() }, (_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Show review ${i + 1} of ${pageCount()}`);
      dot.addEventListener('click', () => {
        goTo(i);
        restart();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });
    syncDots();
  }

  function syncDots(): void {
    const active = currentIndex();
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === active);
      dot.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
  }

  // ---- autoplay -------------------------------------------------------------
  let timer: number | undefined;
  let paused = false;
  let visible = true;

  const stop = (): void => {
    if (timer) window.clearInterval(timer);
    timer = undefined;
  };

  function start(): void {
    stop();
    if (reduceMotion.matches || paused || !visible) return;
    timer = window.setInterval(() => step(1), INTERVAL_MS);
  }

  const restart = (): void => {
    stop();
    start();
  };

  const pause = (): void => {
    paused = true;
    stop();
  };
  const resume = (): void => {
    paused = false;
    start();
  };

  root.addEventListener('mouseenter', pause);
  root.addEventListener('mouseleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);

  // Do not animate a section nobody is looking at.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        visible ? start() : stop();
      },
      { threshold: 0.2 }
    ).observe(root);
  }

  prev?.addEventListener('click', () => {
    step(-1);
    restart();
  });
  next?.addEventListener('click', () => {
    step(1);
    restart();
  });

  let scrollTick: number | undefined;
  track.addEventListener('scroll', () => {
    if (scrollTick) window.clearTimeout(scrollTick);
    scrollTick = window.setTimeout(syncDots, 90);
  });

  let resizeTick: number | undefined;
  window.addEventListener('resize', () => {
    if (resizeTick) window.clearTimeout(resizeTick);
    resizeTick = window.setTimeout(buildDots, 150);
  });

  reduceMotion.addEventListener('change', restart);

  buildDots();
  start();
}

init();

export {};
