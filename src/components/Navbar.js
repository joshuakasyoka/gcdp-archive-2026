import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { useLanguage } from '../contexts/LanguageContext';
import './Navbar.css';

gsap.registerPlugin(useGSAP, SplitText);

export default function Navbar() {
  const location = useLocation();
  const headerRef = useRef(null);
  const titleRef = useRef(null);
  const isAbout = location.pathname === '/about';
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setNavbarHeight = () => {
      document.documentElement.style.setProperty(
        '--navbar-height',
        `${header.offsetHeight}px`
      );
    };

    setNavbarHeight();
    const observer = new ResizeObserver(setNavbarHeight);
    observer.observe(header);
    window.addEventListener('resize', setNavbarHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', setNavbarHeight);
    };
  }, [location.pathname]);

  useGSAP((_, contextSafe) => {
    const titleEl = titleRef.current;
    if (!titleEl) return undefined;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const split = SplitText.create(titleEl, {
        type: 'chars',
        charsClass: 'navbar-title-char',
        aria: 'auto',
      });

      const chars = split.chars;
      const state = { spread: 0, hovering: false };
      // px of gap growth per second between adjacent letters — no upper limit
      const SPREAD_RATE = 10;

      gsap.set(chars, {
        display: 'inline-block',
        transformOrigin: '0% 50%',
      });

      const applySpread = () => {
        gsap.set(chars, { x: (i) => i * state.spread });
      };

      const onTick = contextSafe(() => {
        if (!state.hovering) return;
        state.spread += SPREAD_RATE * gsap.ticker.deltaRatio(60) / 60;
        applySpread();
      });

      gsap.ticker.add(onTick);

      const onEnter = contextSafe(() => {
        gsap.killTweensOf(state);
        state.hovering = true;
      });

      const onLeave = contextSafe(() => {
        state.hovering = false;
        gsap.to(state, {
          spread: 0,
          duration: 0.65,
          ease: 'back.out(1.7)',
          overwrite: true,
          onUpdate: applySpread,
        });
      });

      titleEl.addEventListener('pointerenter', onEnter);
      titleEl.addEventListener('pointerleave', onLeave);

      return () => {
        gsap.ticker.remove(onTick);
        titleEl.removeEventListener('pointerenter', onEnter);
        titleEl.removeEventListener('pointerleave', onLeave);
      };
    });

    return () => mm.revert();
  }, { scope: titleRef });

  return (
    <header className="navbar" ref={headerRef}>
      <nav className="navbar-top">
        <div className="navbar-left">
          <Link to="/" className="navbar-title" ref={titleRef}>
            MA GCDP ARCHIVE
          </Link>
        </div>
        <div className="navbar-right">
          <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
          <NavLink to="/glossary" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Glossary</NavLink>
          <div className="lang-toggle" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === 'en' ? 'lang-btn active' : 'lang-btn'}
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <span className="lang-sep" aria-hidden="true">/</span>
            <button
              type="button"
              lang="ja"
              className={lang === 'ja' ? 'lang-btn active' : 'lang-btn'}
              aria-pressed={lang === 'ja'}
              aria-label="日本語"
              onClick={() => setLang('ja')}
            >
              <span className="lang-long">日本語</span>
              <span className="lang-short" aria-hidden="true">JA</span>
            </button>
          </div>
        </div>
      </nav>

      {!isAbout && (
        <nav className="navbar-subnav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'subnav-link active' : 'subnav-link'}>Artefacts</NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'subnav-link active' : 'subnav-link'}>Projects</NavLink>
          <NavLink to="/collaborations" className={({ isActive }) => isActive ? 'subnav-link active' : 'subnav-link'}>Collaborations</NavLink>
        </nav>
      )}
    </header>
  );
}
