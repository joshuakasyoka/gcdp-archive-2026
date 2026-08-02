import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import { formatCollaboratorName } from '../utils/collaborations';
import { bindChipHover, staggerIn } from '../utils/chipMotion';
import './GlossaryPage.css';

gsap.registerPlugin(useGSAP, SplitText);

const CATEGORY_ORDER = ['Methods'];

export default function GlossaryPage() {
  const { glossary, glossaryDefinitions, glossarySources, loading } = useArchive();
  const [selectedTerm, setSelectedTerm] = useState(null);
  const pageRef = useRef(null);
  const panelRef = useRef(null);

  const categories = CATEGORY_ORDER.filter(c => glossary[c]?.length > 0);
  const hasEntry = term => !!glossaryDefinitions[term] || glossarySources[term]?.length > 0;
  const panelOpen = selectedTerm && hasEntry(selectedTerm);

  useGSAP((_, contextSafe) => {
    const root = pageRef.current;
    if (!root) return undefined;

    const cleanupHover = bindChipHover(root, { scale: 1.04, y: -1.5 });

    const terms = gsap.utils.toArray('.glossary-term');
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      staggerIn(terms, { y: 10, stagger: 0.018, duration: 0.4, delay: 0.05 });
    });

    const onTermClick = contextSafe((e) => {
      const termBtn = e.target.closest('.glossary-term');
      if (!termBtn || termBtn.disabled) return;
      gsap.fromTo(
        termBtn,
        { scale: 0.94 },
        { scale: 1.04, duration: 0.35, ease: 'back.out(1.8)', overwrite: 'auto' }
      );
    });

    root.addEventListener('click', onTermClick);

    return () => {
      cleanupHover();
      root.removeEventListener('click', onTermClick);
      mm.revert();
    };
  }, { scope: pageRef, dependencies: [loading] });

  useGSAP(() => {
    if (!panelOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const titleEl = panel.querySelector('.glossary-panel-title');
    const defEl = panel.querySelector('.glossary-panel-definition');
    const hintEl = panel.querySelector('.glossary-panel-hint');
    const chips = panel.querySelectorAll('.glossary-source-chip');
    const closeBtn = panel.querySelector('.glossary-panel-close');

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        motionOk: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduceMotion } = context.conditions;

        if (reduceMotion) {
          gsap.set(panel, { clearProps: 'all' });
          return;
        }

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(
          panel,
          { x: 36, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.45 },
          0
        );

        if (closeBtn) {
          tl.fromTo(
            closeBtn,
            { rotation: -90, autoAlpha: 0 },
            { rotation: 0, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.5)' },
            0.1
          );
        }

        if (titleEl) {
          const titleSplit = SplitText.create(titleEl, {
            type: 'chars,words',
            mask: 'chars',
            aria: 'auto',
          });
          tl.from(
            titleSplit.chars,
            {
              yPercent: 120,
              autoAlpha: 0,
              stagger: 0.02,
              duration: 0.5,
              ease: 'power3.out',
            },
            0.12
          );
        }

        if (defEl) {
          const defSplit = SplitText.create(defEl, {
            type: 'words,lines',
            mask: 'lines',
            aria: 'auto',
          });
          tl.from(
            defSplit.lines,
            {
              yPercent: 100,
              autoAlpha: 0,
              stagger: 0.07,
              duration: 0.55,
              ease: 'power3.out',
            },
            0.28
          );
        }

        if (hintEl) {
          tl.from(hintEl, { y: 10, autoAlpha: 0, duration: 0.35 }, 0.25);
        }

        if (chips.length) {
          tl.from(
            chips,
            {
              y: 12,
              autoAlpha: 0,
              stagger: 0.05,
              duration: 0.4,
              ease: 'power2.out',
            },
            0.32
          );
        }
      }
    );

    return () => mm.revert();
  }, { dependencies: [selectedTerm, panelOpen], scope: pageRef, revertOnUpdate: true });

  if (loading) return <div className="page-loading">Loading glossary…</div>;

  function handleTermClick(term) {
    if (!hasEntry(term)) return;
    setSelectedTerm(prev => (prev === term ? null : term));
  }

  return (
    <div
      ref={pageRef}
      className={`glossary-page${panelOpen ? ' glossary-page--panel-open' : ''}`}
    >
      <Seo
        title="Glossary"
        path="/glossary"
        description="Glossary of methods used across the MA GCDP Digital Archive."
      />
      <div className="glossary-main">
        <div className="glossary-header">
          <h1 className="glossary-title">Glossary</h1>
          <p className="glossary-intro">
            Methods drawn from across the archive, organised by how they appear in artefact tags.
            Each term reflects language used by students to describe their practice.
          </p>
        </div>

        <div className="glossary-body">
          {categories.map(cat => (
            <div key={cat} className="glossary-group">
              <h2 className="glossary-group-title">{cat}</h2>
              <div className="glossary-terms">
                {glossary[cat].map(term => {
                  const hasDefinition = !!glossaryDefinitions[term];
                  const hasSources = !hasDefinition && glossarySources[term]?.length > 0;
                  return (
                    <button
                      key={term}
                      type="button"
                      className={[
                        'glossary-term',
                        hasDefinition && 'glossary-term--defined',
                        hasSources && 'glossary-term--tagged',
                        selectedTerm === term && 'glossary-term--selected',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleTermClick(term)}
                      disabled={!hasDefinition && !hasSources}
                      aria-pressed={selectedTerm === term}
                    >
                      <span className="glossary-term-name">{formatCollaboratorName(term)}</span>
                      {selectedTerm === term && (
                        <X size={12} strokeWidth={2} className="glossary-term-close" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {panelOpen && (
        <aside className="glossary-panel" ref={panelRef}>
          <button
            type="button"
            className="glossary-panel-close"
            onClick={() => setSelectedTerm(null)}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <h2 className="glossary-panel-title">{formatCollaboratorName(selectedTerm)}</h2>
          {glossaryDefinitions[selectedTerm] ? (
            <p className="glossary-panel-definition">{glossaryDefinitions[selectedTerm]}</p>
          ) : (
            <>
              <p className="glossary-panel-hint">
                No definition yet — tagged by these student projects:
              </p>
              <div className="glossary-panel-chips">
                {glossarySources[selectedTerm]?.map(src => (
                  <Link
                    key={src.projectId || src.projectTitle}
                    to={`/projects/${src.projectId}`}
                    className="glossary-source-chip"
                  >
                    <span className="chip-label">
                      {src.studentName ? `${src.studentName} — ${src.projectTitle}` : src.projectTitle}
                    </span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
