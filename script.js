(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav scroll state ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- live timecode (fake, cosmetic) ---------- */
  const heroTc = document.getElementById('heroTimecode');
  const footerTc = document.getElementById('footerTimecode');
  const startTime = Date.now();

  const pad = (n) => String(n).padStart(2, '0');

  const tick = () => {
    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    const ff = Math.floor((elapsedMs % 1000) / 40); // ~25fps counter
    const str = `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
    if (heroTc) heroTc.textContent = str;
    if (footerTc) footerTc.textContent = str;
  };

  if (!prefersReducedMotion) {
    tick();
    setInterval(tick, 40);
  } else if (heroTc) {
    heroTc.textContent = '00:00:00:00';
  }

  /* ---------- track accordions ---------- */
  const tracks = document.querySelectorAll('[data-track]');
  tracks.forEach((track, i) => {
    const head = track.querySelector('.track__head');
    head.addEventListener('click', () => {
      const isOpen = track.hasAttribute('data-open');
      // close others for a clean single-focus feel
      tracks.forEach(t => {
        t.removeAttribute('data-open');
        t.querySelector('.track__head').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        track.setAttribute('data-open', '');
        head.setAttribute('aria-expanded', 'true');
      }
    });
    if (i === 0) {
      track.setAttribute('data-open', '');
      head.setAttribute('aria-expanded', 'true');
    }
  });

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- work card photo sliders ---------- */
  // Each .work-card__slider holds a few <img> slots pointing to /images/.
  // Until you upload the real photos, a broken image is simply hidden and
  // the card falls back to its plain placeholder look — nothing breaks.
  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const frame = slider.closest('.work-card__frame');
    const dotsWrap = frame.querySelector('[data-dots]');
    const prevBtn = frame.querySelector('[data-prev]');
    const nextBtn = frame.querySelector('[data-next]');
    const allSlides = Array.from(slider.querySelectorAll('.work-card__slide'));

    // Wait for each image to either load or fail, then keep only the ones
    // that actually loaded successfully.
    const checks = allSlides.map((img) => new Promise((resolve) => {
      if (img.complete) {
        resolve({ img, ok: img.naturalWidth > 0 });
        return;
      }
      img.addEventListener('load', () => resolve({ img, ok: true }), { once: true });
      img.addEventListener('error', () => resolve({ img, ok: false }), { once: true });
    }));

    Promise.all(checks).then((results) => {
      const slides = [];
      results.forEach(({ img, ok }) => {
        if (ok) slides.push(img);
        else img.classList.add('is-broken');
      });

      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';

      if (slides.length === 0) return; // nothing to show, plain placeholder stays

      let index = 0;
      slides[0].classList.add('is-active');

      if (slides.length === 1) return; // single photo, no nav needed

      frame.classList.add('is-multi');
      if (prevBtn) prevBtn.style.display = '';
      if (nextBtn) nextBtn.style.display = '';

      const dots = slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'work-card__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', `Show photo ${i + 1}`);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          goTo(i);
        });
        dotsWrap.appendChild(dot);
        return dot;
      });

      function goTo(nextIndex) {
        slides[index].classList.remove('is-active');
        dots[index].classList.remove('is-active');
        index = (nextIndex + slides.length) % slides.length;
        slides[index].classList.add('is-active');
        dots[index].classList.add('is-active');
      }

      let timer = null;
      const startAuto = () => {
        if (prefersReducedMotion) return;
        stopAuto();
        timer = setInterval(() => goTo(index + 1), 3200);
      };
      const stopAuto = () => { if (timer) clearInterval(timer); };

      startAuto();
      frame.addEventListener('mouseenter', stopAuto);
      frame.addEventListener('mouseleave', startAuto);

      if (prevBtn) prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(index - 1);
      });
      if (nextBtn) nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(index + 1);
      });
    });
  });

  /* ---------- process scrubber fill on scroll ---------- */
  const scrubberFill = document.getElementById('scrubberFill');
  const scrubber = document.querySelector('.scrubber');
  if (scrubberFill && scrubber && 'IntersectionObserver' in window) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scrubberFill.style.width = '100%';
          io2.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    io2.observe(scrubber);
  } else if (scrubberFill) {
    scrubberFill.style.width = '100%';
  }

})();
