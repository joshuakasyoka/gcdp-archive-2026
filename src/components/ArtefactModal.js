import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import ProgressiveImage from './ProgressiveImage';
import { formatCollaboratorName } from '../utils/collaborations';
import { bindChipHover } from '../utils/chipMotion';
import './ArtefactModal.css';

gsap.registerPlugin(useGSAP);

function readOriginRect(rect) {
  if (!rect) return null;
  const { top, left, width, height } = rect;
  if (![top, left, width, height].every(n => typeof n === 'number')) return null;
  return { top, left, width, height };
}

export default function ArtefactModal({ artefact, onClose, originRect: originRectProp }) {
  const [imgIndex, setImgIndex] = useState(0);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const closingRef = useRef(false);
  const requestCloseRef = useRef(() => onClose?.());
  const originRect = readOriginRect(originRectProp);

  useGSAP((context, contextSafe) => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content || !artefact) return undefined;

    closingRef.current = false;

    requestCloseRef.current = contextSafe(() => {
      if (closingRef.current) return;
      closingRef.current = true;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        onClose?.();
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power2.in' },
        onComplete: () => onClose?.(),
      });

      const info = content.querySelector('.modal-info');
      if (info) tl.to(info, { x: 20, autoAlpha: 0, duration: 0.22 }, 0);

      if (originRect) {
        const final = content.getBoundingClientRect();
        const dx =
          originRect.left + originRect.width / 2 - (final.left + final.width / 2);
        const dy =
          originRect.top + originRect.height / 2 - (final.top + final.height / 2);
        const sx = Math.max(originRect.width / final.width, 0.08);
        const sy = Math.max(originRect.height / final.height, 0.08);

        tl.to(
          content,
          {
            x: dx,
            y: dy,
            scaleX: sx,
            scaleY: sy,
            borderRadius: 4,
            duration: 0.4,
            ease: 'power3.in',
          },
          0.05
        );
      } else {
        tl.to(
          content,
          { scale: 0.9, y: 24, autoAlpha: 0, duration: 0.3 },
          0.05
        );
      }

      tl.to(overlay, { autoAlpha: 0, duration: 0.28 }, 0.12);
    });

    const mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        motionOk: '(prefers-reduced-motion: no-preference)',
      },
      (ctx) => {
        const { reduceMotion } = ctx.conditions;
        const image = content.querySelector('.modal-image');
        const info = content.querySelector('.modal-info');
        const title = content.querySelector('.modal-title');
        const sections = content.querySelectorAll('.modal-section, .modal-description');
        const chips = content.querySelectorAll('.modal-chip');
        const closeBtns = content.querySelectorAll('.modal-close');

        if (reduceMotion) {
          gsap.set([overlay, content], { clearProps: 'all' });
          return undefined;
        }

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        gsap.set(overlay, { autoAlpha: 0 });
        gsap.set(content, { transformOrigin: '50% 50%' });

        if (originRect) {
          const final = content.getBoundingClientRect();
          const dx =
            originRect.left + originRect.width / 2 - (final.left + final.width / 2);
          const dy =
            originRect.top + originRect.height / 2 - (final.top + final.height / 2);
          const sx = Math.max(originRect.width / final.width, 0.08);
          const sy = Math.max(originRect.height / final.height, 0.08);

          gsap.set(content, {
            x: dx,
            y: dy,
            scaleX: sx,
            scaleY: sy,
            borderRadius: 4,
            autoAlpha: 1,
          });
          gsap.set([info, ...closeBtns], { autoAlpha: 0 });

          tl.to(overlay, { autoAlpha: 1, duration: 0.35 }, 0);
          tl.to(
            content,
            {
              x: 0,
              y: 0,
              scaleX: 1,
              scaleY: 1,
              borderRadius: 2,
              duration: 0.65,
              ease: 'power3.inOut',
            },
            0
          );
        } else {
          gsap.set(content, { scale: 0.88, y: 36, autoAlpha: 0 });
          tl.to(overlay, { autoAlpha: 1, duration: 0.35 }, 0);
          tl.to(
            content,
            {
              scale: 1,
              y: 0,
              autoAlpha: 1,
              duration: 0.55,
              ease: 'power3.out',
            },
            0.05
          );
        }

        if (image) {
          tl.fromTo(
            image,
            { scale: 1.08 },
            { scale: 1, duration: 0.7, ease: 'power2.out' },
            0.15
          );
        }

        tl.to(closeBtns, { autoAlpha: 1, duration: 0.3 }, 0.35);

        if (info) {
          tl.fromTo(
            info,
            { x: 28, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' },
            0.28
          );
        }

        if (title) {
          tl.from(title, { y: 16, autoAlpha: 0, duration: 0.4 }, 0.38);
        }

        if (sections.length) {
          tl.from(
            sections,
            { y: 12, autoAlpha: 0, duration: 0.35, stagger: 0.05 },
            0.42
          );
        }

        if (chips.length) {
          tl.from(
            chips,
            {
              y: 8,
              autoAlpha: 0,
              scale: 0.92,
              duration: 0.3,
              stagger: 0.02,
              ease: 'back.out(1.4)',
            },
            0.48
          );
        }

        const cleanupHover = bindChipHover(content, { scale: 1.04, y: -1.5 });
        return () => cleanupHover();
      }
    );

    return () => mm.revert();
  }, { dependencies: [artefact?.artifact_id, originRectProp], scope: overlayRef, revertOnUpdate: true });

  useEffect(() => {
    setImgIndex(0);
    const onKey = (e) => {
      if (e.key === 'Escape') requestCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [artefact]);

  if (!artefact) return null;

  const imgs = artefact.file_paths || [];
  const tags = artefact.tags || {};
  const requestClose = () => requestCloseRef.current();

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={requestClose}>
      <div
        className="modal-content"
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">

          {/* Left: artefact image */}
          <div className="modal-image">
            <button type="button" className="modal-close modal-close--on-image" onClick={requestClose} aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>
            {imgs.length > 0 ? (
              <>
                <ProgressiveImage src={imgs[imgIndex]} alt={artefact.title} loading="eager" />
                {imgs.length > 1 && (
                  <div className="modal-image-nav">
                    {imgs.map((_, i) => (
                      <button
                        key={i}
                        className={i === imgIndex ? 'dot active' : 'dot'}
                        onClick={() => setImgIndex(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="modal-image-placeholder" />
            )}
          </div>

          {/* Right: info panel */}
          <div className="modal-info">
            <button type="button" className="modal-close modal-close--on-info" onClick={requestClose} aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>

            <h2 className="modal-title">{artefact.title}</h2>

            {artefact.description && (
              <p className="modal-description">{artefact.description}</p>
            )}

            {(artefact._students?.length ? artefact._students : [artefact._student]).filter(s => s?.name?.display_name).length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Student</div>
                <div className="modal-chips">
                  {(artefact._students?.length ? artefact._students : [artefact._student])
                    .filter(s => s?.name?.display_name)
                    .map(s => (
                      <Link
                        key={s.student_id}
                        to={`/students/${s.student_id}`}
                        className="modal-chip modal-chip--student"
                        onClick={requestClose}
                      >
                        <span className="chip-label">{s.name.display_name}</span>
                        <ArrowUpRight size={11} strokeWidth={1.5} />
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {artefact._project && (
              <div className="modal-section">
                <div className="modal-section-label">Project</div>
                <div className="modal-chips">
                  <Link
                    to={`/projects/${artefact._project.project_id}`}
                    className="modal-chip modal-chip--collab"
                    onClick={requestClose}
                  >
                    <span className="chip-label">{artefact._project.title}</span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}

            {tags.collaborators?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Collaborators</div>
                <div className="modal-chips">
                  {tags.collaborators.map(t => (
                    <span key={t} className="modal-chip modal-chip--collab">
                      <span className="chip-label">{formatCollaboratorName(t)}</span>
                      <ArrowUpRight size={11} strokeWidth={1.5} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tags.materials?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Materials</div>
                <div className="modal-chips">
                  {tags.materials.map(t => <span key={t} className="modal-chip">{formatCollaboratorName(t)}</span>)}
                </div>
              </div>
            )}

            {tags.methods?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Methods</div>
                <div className="modal-chips">
                  {tags.methods.map(t => <span key={t} className="modal-chip">{formatCollaboratorName(t)}</span>)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
