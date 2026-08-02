import gsap from 'gsap';

const CHIP_SELECTOR = [
  '.filter-tag',
  '.active-chip',
  '.filter-toggle-chip:not(.filter-toggle-chip--decorative)',
  '.filter-search-icon-btn',
  '.glossary-term:not(:disabled)',
  '.glossary-source-chip',
  '.glossary-panel-close',
  '.modal-chip',
  '.project-tag-chip--collab',
].join(', ');

/** Chips whose arrow icons should do a full 360° spin on hover */
const ARROW_SPIN_SELECTOR = [
  '.modal-chip',
  '.glossary-source-chip',
  '.project-tag-chip--collab',
].join(', ');

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isChip(el, root) {
  return el instanceof Element && root.contains(el) && el.matches(CHIP_SELECTOR);
}

function hasArrowSpin(chip) {
  return chip.matches(ARROW_SPIN_SELECTOR) && !!chip.querySelector('svg');
}

/**
 * Bind lift / icon hover interactions for archive chips & icon buttons.
 * Returns a cleanup function. Skip entirely when reduced motion is preferred.
 */
export function bindChipHover(root, { scale = 1.045, y = -2 } = {}) {
  if (!root || prefersReducedMotion()) return () => {};

  const enter = (chip) => {
    gsap.to(chip, {
      scale,
      y,
      duration: 0.35,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    const icon = chip.querySelector('svg');
    if (!icon) return;

    if (hasArrowSpin(chip)) {
      gsap.to(icon, {
        rotation: '+=360',
        scale: 1.15,
        duration: 0.55,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
      return;
    }

    const tip = chip.classList.contains('filter-search-icon-btn')
      || chip.classList.contains('glossary-panel-close');
    gsap.to(icon, {
      rotation: tip ? 10 : -8,
      scale: 1.12,
      duration: 0.4,
      ease: 'back.out(1.7)',
      overwrite: 'auto',
    });
  };

  const leave = (chip) => {
    gsap.to(chip, {
      scale: 1,
      y: 0,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    const icon = chip.querySelector('svg');
    if (!icon) return;

    if (hasArrowSpin(chip)) {
      // Let the 360 finish; only ease scale back (rotation stays at a full turn)
      gsap.to(icon, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: () => {
          const current = gsap.getProperty(icon, 'rotation');
          gsap.set(icon, { rotation: Math.round(current / 360) * 360 });
        },
      });
      return;
    }

    gsap.to(icon, {
      rotation: 0,
      scale: 1,
      duration: 0.35,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  };

  const onOver = (e) => {
    const chip = e.target.closest(CHIP_SELECTOR);
    if (!isChip(chip, root)) return;
    if (chip.contains(e.relatedTarget)) return;
    enter(chip);
  };

  const onOut = (e) => {
    const chip = e.target.closest(CHIP_SELECTOR);
    if (!isChip(chip, root)) return;
    if (chip.contains(e.relatedTarget)) return;
    leave(chip);
  };

  const onDown = (e) => {
    const chip = e.target.closest(CHIP_SELECTOR);
    if (!isChip(chip, root)) return;
    gsap.to(chip, {
      scale: 0.97,
      y: 0,
      duration: 0.12,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const onUp = (e) => {
    const chip = e.target.closest(CHIP_SELECTOR);
    if (!isChip(chip, root)) return;
    enter(chip);
  };

  root.addEventListener('mouseover', onOver);
  root.addEventListener('mouseout', onOut);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);

  return () => {
    root.removeEventListener('mouseover', onOver);
    root.removeEventListener('mouseout', onOut);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onUp);
    gsap.killTweensOf(root.querySelectorAll(`${CHIP_SELECTOR}, ${CHIP_SELECTOR} svg`));
    gsap.set(root.querySelectorAll(CHIP_SELECTOR), { clearProps: 'transform' });
  };
}

export function staggerIn(targets, vars = {}) {
  if (!targets?.length || prefersReducedMotion()) {
    if (targets?.length) gsap.set(targets, { clearProps: 'all' });
    return null;
  }
  return gsap.from(targets, {
    y: 12,
    autoAlpha: 0,
    duration: 0.4,
    stagger: 0.02,
    ease: 'power3.out',
    overwrite: 'auto',
    ...vars,
  });
}
