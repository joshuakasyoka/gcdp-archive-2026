import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import './WorkshopTicker.css';

const PIXELS_PER_SECOND = 40;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "Sat 14 Nov 2026", "3–5 Dec 2026", "28 Nov – 2 Dec 2026"
export function formatWorkshopDate(start, end) {
  const a = parseDate(start);
  if (!a) return '';
  const b = parseDate(end);
  const day = d => d.getDate();
  const month = d => d.toLocaleDateString('en-GB', { month: 'short' });
  if (!b || b.getTime() === a.getTime()) {
    const weekday = a.toLocaleDateString('en-GB', { weekday: 'short' });
    return `${weekday} ${day(a)} ${month(a)} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${day(a)}–${day(b)} ${month(a)} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${day(a)} ${month(a)} – ${day(b)} ${month(b)} ${a.getFullYear()}`;
  }
  return `${day(a)} ${month(a)} ${a.getFullYear()} – ${day(b)} ${month(b)} ${b.getFullYear()}`;
}

function normalizeUrl(url) {
  const v = (url || '').trim();
  if (!v) return '';
  return /^(https?:|mailto:)/i.test(v) ? v : `https://${v}`;
}

function WorkshopItems({ workshops, hidden }) {
  return workshops.map((w, i) => (
    <div className="workshop-ticker__item" key={i} aria-hidden={hidden || undefined}>
      {w.date && <span className="workshop-ticker__date">{formatWorkshopDate(w.date, w.end_date)}</span>}
      <span className="workshop-ticker__title">{w.title}</span>
      {w.url && (
        <a
          className="workshop-ticker__link"
          href={normalizeUrl(w.url)}
          target="_blank"
          rel="noreferrer"
          tabIndex={hidden ? -1 : undefined}
        >
          {w.label?.trim() || 'Find out more'} ↗
        </a>
      )}
    </div>
  ));
}

// Outlined strip of a project's workshops that scrolls in a loop and pauses
// while hovered or while one of its links has keyboard focus.
export default function WorkshopTicker({ workshops }) {
  const list = useMemo(
    () =>
      (workshops || [])
        .filter(w => w?.title?.trim())
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [workshops]
  );

  const trackRef = useRef(null);
  const groupRef = useRef(null);
  const [copies, setCopies] = useState(1);
  const [duration, setDuration] = useState(30);

  // Repeat the list until half the belt is at least as wide as the strip, so
  // the loop never shows a gap; the speed stays constant whatever the length.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return undefined;
    const measure = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (!groupWidth) return;
      const needed = Math.max(1, Math.ceil(track.getBoundingClientRect().width / groupWidth));
      setCopies(needed);
      setDuration(Math.max(12, (groupWidth * needed) / PIXELS_PER_SECOND));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(group);
    return () => ro.disconnect();
  }, [list]);

  if (!list.length) return null;

  const repeats = Array.from({ length: copies * 2 - 1 }, (_, i) => i);

  return (
    <section className="workshop-ticker" aria-label="Workshops">
      <div className="workshop-ticker__label">
        <Calendar size={14} strokeWidth={1.5} aria-hidden="true" />
        Workshops
      </div>
      <div className="workshop-ticker__track" ref={trackRef}>
        <div className="workshop-ticker__belt" style={{ animationDuration: `${duration}s` }}>
          <div className="workshop-ticker__group" ref={groupRef}>
            <WorkshopItems workshops={list} />
          </div>
          {repeats.map(i => (
            <div className="workshop-ticker__group" key={i} aria-hidden="true">
              <WorkshopItems workshops={list} hidden />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
