import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const headerRef = useRef(null);
  const isAbout = location.pathname === '/about';

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

  return (
    <header className="navbar" ref={headerRef}>
      <nav className="navbar-top">
        <div className="navbar-left">
          <Link to="/" className="navbar-title">MA GCDP ARCHIVE</Link>
        </div>
        <div className="navbar-right">
          <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
          <NavLink to="/glossary" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Glossary</NavLink>
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
