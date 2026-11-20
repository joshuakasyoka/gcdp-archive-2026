import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, X, Plus, ImagePlus, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import { COHORTS } from '../config/cohorts';
import {
  API_HOST,
  UnauthorizedError,
  createStudent,
  deleteArtifact,
  deleteStudent,
  fetchStudent,
  getCmsKey,
  setCmsKey,
  updateStudent,
  uploadImage,
} from '../services/api';
import './EditPage.css';

const TAG_FIELDS = [
  { key: 'themes', label: 'Themes' },
  { key: 'design_as', label: 'Design as' },
  { key: 'materials', label: 'Materials' },
  { key: 'methods', label: 'Methods' },
  { key: 'collaborators', label: 'Collaborators' },
];

const BASE_TYPES = [
  'documentation',
  'tool',
  'physical_prototype',
  'digital_prototype',
  'material',
  'product',
];

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2400;

// ── helpers ──────────────────────────────────────────────────────────────

function slugify(term) {
  return term
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function humanize(slug) {
  return (slug || '').replace(/_/g, ' ');
}

function trailingNumber(id) {
  const match = /(\d+)$/.exec(id || '');
  return match ? parseInt(match[1], 10) : 0;
}

// Project ids must be unique across every student, because /projects/:id
// routes on them. The API always names a new student's first project
// "project_01", so we assign the id ourselves.
function nextProjectId(students) {
  let max = 0;
  for (const s of students) {
    for (const p of s.projects || []) max = Math.max(max, trailingNumber(p.project_id));
  }
  return `project_${String(max + 1).padStart(3, '0')}`;
}

// Uses the highest existing number (not the count) so an id is never reused
// after a delete.
function nextArtifactId(project) {
  const projectNum = (project.project_id || '').replace(/^project_/, '');
  let max = 0;
  for (const a of project.artifacts || []) max = Math.max(max, trailingNumber(a.artifact_id));
  return `artifact_${projectNum}_${String(max + 1).padStart(2, '0')}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't read ${file.name}`));
    };
    img.src = url;
  });
}

// Shrinks large photos in the browser before upload so each request stays
// well under the hosting limit. Small files and GIFs go up untouched.
async function prepareImage(file) {
  if (file.type === 'image/gif') {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is too large (GIFs must be under 3.5 MB).`);
    return file;
  }
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (file.size <= MAX_UPLOAD_BYTES && longest <= MAX_IMAGE_EDGE) return file;

  const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

// Photo items are { key, url?, file?, caption } — `url` for photos already
// stored, `file` for ones picked but not uploaded yet.
let photoKeySeed = 0;
const photoKey = () => `photo_${(photoKeySeed += 1)}`;

async function uploadPhotos(items, studentId, onProgress) {
  const pending = items.filter(i => i.file).length;
  let done = 0;
  const out = [];
  for (const item of items) {
    if (item.file) {
      done += 1;
      onProgress?.(`Uploading photo ${done} of ${pending}…`);
      const prepared = await prepareImage(item.file);
      out.push({ url: await uploadImage(prepared, studentId), caption: item.caption || '' });
    } else if (item.url) {
      out.push({ url: item.url, caption: item.caption || '' });
    }
  }
  return out;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUrl(value) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function toProjectForm(p = {}) {
  return {
    title: p.title || '',
    subtitle: p.subtitle || '',
    hmw_question: p.hmw_question || '',
    description: p.description || '',
    website: p.website || '',
    status: p.status || 'in_progress',
    submission_date: p.submission_date ? String(p.submission_date).slice(0, 10) : '',
    course_code: p.course_code ?? 'DESIGN401',
    semester: p.semester || '',
    grade: p.grade || '',
    photos: (p.project_photos || [])
      .filter(ph => ph?.url)
      .map(ph => ({ key: photoKey(), url: ph.url, caption: ph.caption || '' })),
    workshops: (p.workshops || []).map(w => ({
      key: photoKey(),
      title: w.title || '',
      date: w.date ? String(w.date).slice(0, 10) : '',
      end_date: w.end_date ? String(w.end_date).slice(0, 10) : '',
      url: w.url || '',
      label: w.label || '',
    })),
  };
}

// Empty optional fields become `undefined`, which drops them from the saved
// record instead of storing blank strings.
function fromProjectForm(f, projectPhotos) {
  const opt = v => (v && v.trim() ? v.trim() : undefined);
  return {
    title: f.title.trim(),
    subtitle: opt(f.subtitle),
    hmw_question: opt(f.hmw_question),
    description: f.description.trim(),
    website: opt(normalizeUrl(f.website)),
    status: f.status,
    submission_date: f.submission_date ? new Date(f.submission_date).toISOString() : undefined,
    course_code: opt(f.course_code),
    semester: opt(f.semester),
    grade: opt(f.grade),
    project_photos: projectPhotos,
    // Rows without a title are ignored; an empty list removes the banner.
    workshops: (f.workshops || [])
      .filter(w => w.title.trim())
      .map(w => {
        const row = { title: w.title.trim() };
        if (w.date) row.date = w.date;
        if (w.end_date && w.end_date !== w.date) row.end_date = w.end_date;
        if (w.url.trim()) row.url = normalizeUrl(w.url);
        if (w.label.trim()) row.label = w.label.trim();
        return row;
      }),
  };
}

// ── small components ─────────────────────────────────────────────────────

function TagField({ id, label, values, onChange, suggestions }) {
  const [draft, setDraft] = useState('');
  const listId = `${id}-options`;

  const add = (raw) => {
    const parts = raw.split(',').map(slugify).filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setDraft('');
  };

  return (
    <div className="edit-field">
      <label className="edit-label" htmlFor={id}>{label}</label>
      <div className="edit-tags">
        {values.map(v => (
          <span key={v} className="edit-chip">
            {humanize(v)}
            <button
              type="button"
              aria-label={`Remove ${humanize(v)}`}
              onClick={() => onChange(values.filter(x => x !== v))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="edit-tag-input"
          list={listId}
          value={draft}
          placeholder={values.length ? 'Add another…' : 'Type and press Enter'}
          onChange={e => {
            const v = e.target.value;
            if (v.endsWith(',')) add(v);
            else setDraft(v);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
        <datalist id={listId}>
          {suggestions.filter(s => !values.includes(s)).map(s => (
            <option key={s} value={humanize(s)} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function PhotoField({ label, items, onChange, captions = false, max = 10 }) {
  const cache = useRef(new Map());

  const srcFor = item => {
    if (item.url) return item.url;
    let src = cache.current.get(item.key);
    if (!src) {
      src = URL.createObjectURL(item.file);
      cache.current.set(item.key, src);
    }
    return src;
  };

  // Free preview URLs for photos that were removed, and all of them on unmount.
  useEffect(() => {
    const live = new Set(items.map(i => i.key));
    for (const [key, src] of cache.current) {
      if (!live.has(key)) {
        URL.revokeObjectURL(src);
        cache.current.delete(key);
      }
    }
  }, [items]);
  useEffect(() => {
    const map = cache.current;
    return () => {
      for (const src of map.values()) URL.revokeObjectURL(src);
      map.clear();
    };
  }, []);

  const addFiles = files => {
    const images = [...files].filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    const added = images.map(file => ({ key: photoKey(), file, caption: '' }));
    onChange([...items, ...added].slice(0, max));
  };

  const update = (index, patch) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  return (
    <div className="edit-field">
      <span className="edit-label">{label}</span>
      <label
        className="edit-drop"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <ImagePlus size={18} />
        <span>Drop images here or click to choose (JPEG, PNG, WebP, GIF · up to {max})</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={e => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {items.length > 0 && (
        <ul className="edit-previews">
          {items.map((item, i) => (
            <li key={item.key} className="edit-preview">
              <div className="edit-preview-img">
                <img src={srcFor(item)} alt={item.caption || item.file?.name || ''} />
                {i === 0 && <span className="edit-cover">Cover</span>}
                {item.file && <span className="edit-new">New</span>}
                <div className="edit-preview-actions">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...items];
                        const [moved] = next.splice(i, 1);
                        onChange([moved, ...next]);
                      }}
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              {captions && (
                <input
                  className="edit-input edit-caption"
                  placeholder="Caption (optional)"
                  aria-label={`Caption for photo ${i + 1}`}
                  value={item.caption}
                  onChange={e => update(i, { caption: e.target.value })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const EMPTY_WORKSHOP = () => ({ key: photoKey(), title: '', date: '', end_date: '', url: '', label: '' });

// One row per workshop: title, dates and a link. Add as many as needed.
function WorkshopsField({ idPrefix, rows, onChange }) {
  const update = (index, patch) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const id = (index, name) => `${idPrefix}-workshop-${index}-${name}`;

  return (
    <div className="edit-field">
      <span className="edit-label">Workshops</span>
      <span className="edit-muted">Shown as a scrolling banner at the top of the project page.</span>
      <div className="edit-workshops">
        {rows.map((r, i) => (
          <div key={r.key} className="edit-workshop">
            <div className="edit-workshop-head">
              <span className="edit-workshop-number">Workshop {i + 1}</span>
              <button
                type="button"
                className="edit-danger-link"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
            <div className="edit-field">
              <label className="edit-label" htmlFor={id(i, 'title')}>Workshop title</label>
              <input
                id={id(i, 'title')}
                className="edit-input"
                value={r.title}
                placeholder="Walking Peckham Road: an open walk"
                onChange={e => update(i, { title: e.target.value })}
              />
            </div>
            <div className="edit-grid-2">
              <div className="edit-field">
                <label className="edit-label" htmlFor={id(i, 'date')}>Date</label>
                <input
                  id={id(i, 'date')}
                  className="edit-input"
                  type="date"
                  value={r.date}
                  onChange={e => update(i, { date: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label className="edit-label" htmlFor={id(i, 'end')}>End date (if more than a day)</label>
                <input
                  id={id(i, 'end')}
                  className="edit-input"
                  type="date"
                  min={r.date || undefined}
                  value={r.end_date}
                  onChange={e => update(i, { end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="edit-grid-2">
              <div className="edit-field">
                <label className="edit-label" htmlFor={id(i, 'url')}>Link</label>
                <input
                  id={id(i, 'url')}
                  className="edit-input"
                  inputMode="url"
                  placeholder="https://"
                  value={r.url}
                  onChange={e => update(i, { url: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label className="edit-label" htmlFor={id(i, 'label')}>Link text</label>
                <input
                  id={id(i, 'label')}
                  className="edit-input"
                  placeholder="Find out more"
                  value={r.label}
                  onChange={e => update(i, { label: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        <GhostRow
          title="Add workshop"
          hint="Title, date and link"
          onClick={() => onChange([...rows, EMPTY_WORKSHOP()])}
        />
      </div>
    </div>
  );
}

function ProjectForm({ idPrefix, initial, submitLabel, disabled, onSubmit, onCancel }) {
  const [f, setF] = useState(() => toProjectForm(initial));
  const [moreOpen, setMoreOpen] = useState(false);

  // Show the saved values again whenever the project (or its data) changes.
  useEffect(() => {
    setF(toProjectForm(initial));
  }, [initial]);

  const set = key => e => setF(prev => ({ ...prev, [key]: e.target.value }));
  const id = name => `${idPrefix}-${name}`;

  return (
    <form
      className="edit-form edit-project-form"
      onSubmit={e => {
        e.preventDefault();
        if (f.title.trim()) onSubmit(f);
      }}
    >
      <div className="edit-field">
        <label className="edit-label" htmlFor={id('title')}>Title</label>
        <input id={id('title')} className="edit-input" value={f.title} onChange={set('title')} required />
      </div>

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('subtitle')}>Subtitle</label>
        <input id={id('subtitle')} className="edit-input" value={f.subtitle} onChange={set('subtitle')} />
      </div>

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('hmw')}>“How might we…” question</label>
        <textarea id={id('hmw')} className="edit-input" rows={2} value={f.hmw_question} onChange={set('hmw_question')} />
      </div>

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('desc')}>Description</label>
        <textarea id={id('desc')} className="edit-input" rows={6} value={f.description} onChange={set('description')} />
      </div>

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('website')}>Website</label>
        <input
          id={id('website')}
          className="edit-input"
          type="text"
          inputMode="url"
          placeholder="https://"
          value={f.website}
          onChange={set('website')}
        />
      </div>

      <WorkshopsField
        idPrefix={idPrefix}
        rows={f.workshops}
        onChange={workshops => setF(prev => ({ ...prev, workshops }))}
      />

      <PhotoField
        label="Project photos"
        items={f.photos}
        captions
        onChange={photos => setF(prev => ({ ...prev, photos }))}
      />

      <div className="edit-grid-2">
        <div className="edit-field">
          <label className="edit-label" htmlFor={id('status')}>Status</label>
          <select id={id('status')} className="edit-input" value={f.status} onChange={set('status')}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="edit-field">
          <label className="edit-label" htmlFor={id('submitted')}>Submission date</label>
          <input
            id={id('submitted')}
            className="edit-input"
            type="date"
            value={f.submission_date}
            onChange={set('submission_date')}
          />
        </div>
      </div>

      <button
        type="button"
        className="edit-link edit-more-toggle"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(o => !o)}
      >
        <ChevronDown size={14} className={clsx(moreOpen && 'is-open')} /> Course details
      </button>
      {moreOpen && (
        <div className="edit-grid-3">
          <div className="edit-field">
            <label className="edit-label" htmlFor={id('course')}>Course code</label>
            <input id={id('course')} className="edit-input" value={f.course_code} onChange={set('course_code')} />
          </div>
          <div className="edit-field">
            <label className="edit-label" htmlFor={id('semester')}>Semester</label>
            <input
              id={id('semester')}
              className="edit-input"
              placeholder="e.g. Fall 2026"
              value={f.semester}
              onChange={set('semester')}
            />
          </div>
          <div className="edit-field">
            <label className="edit-label" htmlFor={id('grade')}>Grade</label>
            <input id={id('grade')} className="edit-input" value={f.grade} onChange={set('grade')} />
          </div>
        </div>
      )}

      <div className="edit-row">
        <button type="submit" className="edit-btn edit-btn--primary" disabled={disabled || !f.title.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="edit-link" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}

// Blank placeholder row that shows where to add something. `step` shows a
// number instead of a plus; `disabled` greys it out until it's reachable.
function GhostRow({ title, hint, step, disabled, onClick }) {
  return (
    <button
      type="button"
      className="edit-artefact edit-artefact--ghost"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="edit-thumb edit-thumb--ghost" aria-hidden="true">
        {step ? <span className="edit-step">{step}</span> : <Plus size={18} />}
      </span>
      <span className="edit-artefact-body">
        <span className="edit-artefact-title">{title}</span>
        {hint && <span className="edit-muted">{hint}</span>}
      </span>
    </button>
  );
}

function KeyGate({ error, onUnlock }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="edit-gate"
      onSubmit={e => {
        e.preventDefault();
        if (value.trim()) onUnlock(value.trim());
      }}
    >
      <h1 className="edit-title">Edit archive</h1>
      <p className="edit-muted">Enter the CMS key to add or remove artefacts.</p>
      <label className="edit-label" htmlFor="cms-key">CMS key</label>
      <input
        id="cms-key"
        className="edit-input"
        type="password"
        autoComplete="current-password"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      {error && <p className="edit-error">{error}</p>}
      <button type="submit" className="edit-btn edit-btn--primary">Unlock</button>
    </form>
  );
}

function toArtefactForm(a = {}) {
  const tags = {};
  for (const { key } of TAG_FIELDS) tags[key] = [...(a.tags?.[key] || [])];
  return {
    title: a.title || '',
    description: a.description || '',
    type: a.type || 'documentation',
    creation_date: a.creation_date ? String(a.creation_date).slice(0, 10) : todayIso(),
    tags,
    photos: (a.file_paths || []).filter(Boolean).map(url => ({ key: photoKey(), url, caption: '' })),
  };
}

function ArtefactForm({ idPrefix, initial, heading, submitLabel, disabled, typeOptions, suggestions, className, onSubmit, onCancel }) {
  const [f, setF] = useState(() => toArtefactForm(initial));

  // Show the saved values again whenever the artefact (or its data) changes.
  useEffect(() => {
    setF(toArtefactForm(initial));
  }, [initial]);

  const id = name => `${idPrefix}-${name}`;
  const types = typeOptions.includes(f.type) ? typeOptions : [...typeOptions, f.type];

  return (
    <form
      className={clsx('edit-form', className)}
      onSubmit={e => {
        e.preventDefault();
        if (f.title.trim()) onSubmit(f);
      }}
    >
      {heading && <h3 className="edit-h3">{heading}</h3>}

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('title')}>Title</label>
        <input
          id={id('title')}
          className="edit-input"
          value={f.title}
          onChange={e => setF(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div className="edit-field">
        <label className="edit-label" htmlFor={id('desc')}>Description</label>
        <textarea
          id={id('desc')}
          className="edit-input"
          rows={4}
          value={f.description}
          onChange={e => setF(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="edit-grid-2">
        <div className="edit-field">
          <label className="edit-label" htmlFor={id('type')}>Type</label>
          <select
            id={id('type')}
            className="edit-input"
            value={f.type}
            onChange={e => setF(prev => ({ ...prev, type: e.target.value }))}
          >
            {types.map(t => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </select>
        </div>
        <div className="edit-field">
          <label className="edit-label" htmlFor={id('date')}>Date</label>
          <input
            id={id('date')}
            className="edit-input"
            type="date"
            value={f.creation_date}
            onChange={e => setF(prev => ({ ...prev, creation_date: e.target.value }))}
          />
        </div>
      </div>

      <PhotoField
        label="Photos"
        items={f.photos}
        onChange={photos => setF(prev => ({ ...prev, photos }))}
      />

      {TAG_FIELDS.map(({ key, label }) => (
        <TagField
          key={key}
          id={id(`tag-${key}`)}
          label={label}
          values={f.tags[key]}
          suggestions={suggestions[key] || []}
          onChange={values => setF(prev => ({ ...prev, tags: { ...prev.tags, [key]: values } }))}
        />
      ))}

      <div className="edit-row">
        <button type="submit" className="edit-btn edit-btn--primary" disabled={disabled || !f.title.trim()}>
          {submitLabel}
        </button>
        <button type="button" className="edit-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const NEW_ARTEFACT = {};

const NEW_PROJECT = {};

// ── page ─────────────────────────────────────────────────────────────────

export default function EditPage() {
  const { students, artefacts, loading, error: loadError, reload } = useArchive();

  const [cmsKey, setKeyState] = useState(getCmsKey);
  const [gateError, setGateError] = useState('');
  const [cohort, setCohort] = useState(COHORTS[0].value);
  const [studentId, setStudentId] = useState(null);
  const [projectId, setProjectId] = useState(null);

  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', project_title: '' });
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [artefactFormOpen, setArtefactFormOpen] = useState(false);

  const [editingArtefactId, setEditingArtefactId] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  const cohortStudents = useMemo(
    () =>
      students
        .filter(s => s.student_year === cohort)
        .sort((a, b) => (a.name?.display_name || '').localeCompare(b.name?.display_name || '')),
    [students, cohort]
  );
  const student = cohortStudents.find(s => s.student_id === studentId) || null;
  const project = student?.projects?.find(p => p.project_id === projectId) || null;

  // Keep selections valid as the cohort or data changes.
  useEffect(() => {
    if (!cohortStudents.some(s => s.student_id === studentId)) {
      setStudentId(cohortStudents[0]?.student_id ?? null);
    }
  }, [cohortStudents, studentId]);

  useEffect(() => {
    if (!student) {
      setProjectId(null);
    } else if (!student.projects?.some(p => p.project_id === projectId)) {
      setProjectId(student.projects?.[0]?.project_id ?? null);
    }
  }, [student, projectId]);

  // Close the details panel when switching project — unless we just created
  // this project via "Add student", in which case open it to finish filling in.
  const openDetailsFor = useRef(null);
  useEffect(() => {
    setProjectEditOpen(projectId !== null && openDetailsFor.current === projectId);
    openDetailsFor.current = null;
    setArtefactFormOpen(false);
    setEditingArtefactId(null);
  }, [projectId]);

  const suggestions = useMemo(() => {
    const out = {};
    for (const { key } of TAG_FIELDS) {
      const set = new Set();
      for (const a of artefacts) for (const t of a.tags?.[key] || []) if (t) set.add(t);
      out[key] = [...set].sort();
    }
    return out;
  }, [artefacts]);

  const typeOptions = useMemo(() => {
    const set = new Set(BASE_TYPES);
    for (const a of artefacts) if (a.type) set.add(a.type);
    return [...set];
  }, [artefacts]);

  const unlock = key => {
    setCmsKey(key);
    setKeyState(key);
    setGateError('');
  };

  // Runs a write; on a rejected key, drops back to the key prompt.
  const run = async (label, fn, success) => {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
      await reload();
      if (success) setMessage({ kind: 'ok', text: success });
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setCmsKey('');
        setKeyState('');
        setGateError(err.message);
      } else {
        setMessage({ kind: 'error', text: err.message || 'Something went wrong.' });
      }
      return false;
    } finally {
      setBusy('');
    }
  };

  const handleAddStudent = async e => {
    e.preventDefault();
    const first = newStudent.first_name.trim();
    const last = newStudent.last_name.trim();
    const projectTitle = newStudent.project_title.trim();
    if (!first || !projectTitle) return;
    let createdId = null;
    let createdProjectId = null;
    const ok = await run('Adding student…', async () => {
      const created = await createStudent({
        first_name: first,
        last_name: last,
        display_name: `${first} ${last}`.trim(),
        student_year: cohort,
        enrollment_year: cohort,
        project_title: projectTitle,
      });
      createdId = created.student_id;
      createdProjectId = nextProjectId(students);
      const firstProject = { ...created.projects[0], project_id: createdProjectId, semester: '' };
      await updateStudent(createdId, { projects: [firstProject] });
    }, `Added ${`${first} ${last}`.trim()}. Fill in their project details below.`);
    if (ok) {
      openDetailsFor.current = createdProjectId;
      setStudentId(createdId);
      setProjectId(createdProjectId);
      setNewStudent({ first_name: '', last_name: '', project_title: '' });
      setNewStudentOpen(false);
    }
  };

  const handleAddProject = async f => {
    if (!student) return;
    const id = nextProjectId(students);
    const title = f.title.trim();
    const ok = await run('Adding project…', async () => {
      const photos = await uploadPhotos(f.photos, student.student_id, setBusy);
      setBusy('Saving project…');
      const fresh = await fetchStudent(student.student_id);
      const projectRecord = {
        project_id: id,
        ...fromProjectForm(f, photos),
        artifacts: [],
      };
      await updateStudent(student.student_id, { projects: [...(fresh.projects || []), projectRecord] });
    }, `Added project “${title}”.`);
    if (ok) {
      setProjectId(id);
      setNewProjectOpen(false);
    }
  };

  const handleSaveProject = async f => {
    if (!student || !project) return;
    const title = f.title.trim();
    const ok = await run('Saving project…', async () => {
      const photos = await uploadPhotos(f.photos, student.student_id, setBusy);
      setBusy('Saving project…');
      // Re-read so artefacts added elsewhere since this page loaded are kept.
      const fresh = await fetchStudent(student.student_id);
      const freshProject = (fresh.projects || []).find(p => p.project_id === project.project_id);
      if (!freshProject) throw new Error('That project no longer exists. Reload and try again.');
      const updated = {
        ...freshProject,
        ...fromProjectForm(f, photos),
        project_id: freshProject.project_id,
        artifacts: freshProject.artifacts || [],
      };
      const projectsNext = fresh.projects.map(p => (p.project_id === updated.project_id ? updated : p));
      await updateStudent(student.student_id, { projects: projectsNext });
    }, `Saved “${title}”.`);
    if (ok) setProjectEditOpen(false);
  };

  // Re-reads the student right before writing so nothing saved since this
  // page loaded is overwritten, then applies `change` to this project.
  const writeProject = async change => {
    const fresh = await fetchStudent(student.student_id);
    const freshProject = (fresh.projects || []).find(p => p.project_id === project.project_id);
    if (!freshProject) throw new Error('That project no longer exists. Reload and try again.');
    const projectsNext = fresh.projects.map(p =>
      p.project_id === freshProject.project_id ? change(freshProject) : p
    );
    await updateStudent(student.student_id, { projects: projectsNext });
  };

  const handleAddArtefact = async f => {
    if (!student || !project) return;
    const title = f.title.trim();
    const ok = await run('Saving artefact…', async () => {
      const photos = await uploadPhotos(f.photos, student.student_id, setBusy);
      setBusy('Saving artefact…');
      await writeProject(p => ({
        ...p,
        artifacts: [
          ...(p.artifacts || []),
          {
            artifact_id: nextArtifactId(p),
            title,
            description: f.description.trim(),
            type: f.type,
            file_paths: photos.map(ph => ph.url),
            creation_date: f.creation_date ? new Date(f.creation_date).toISOString() : new Date().toISOString(),
            w: 180,
            h: 130,
            priority: false,
            tags: { ...f.tags },
          },
        ],
      }));
    }, `Added “${title}”.`);
    if (ok) setArtefactFormOpen(false);
  };

  const handleSaveArtefact = async (artifactId, f) => {
    if (!student || !project) return;
    const title = f.title.trim();
    const ok = await run('Saving artefact…', async () => {
      const photos = await uploadPhotos(f.photos, student.student_id, setBusy);
      setBusy('Saving artefact…');
      await writeProject(p => {
        const existing = (p.artifacts || []).find(a => a.artifact_id === artifactId);
        if (!existing) throw new Error('That artefact no longer exists. Reload and try again.');
        // Keep the original timestamp unless the date was actually changed.
        const sameDay = String(existing.creation_date || '').slice(0, 10) === f.creation_date;
        const updated = {
          ...existing,
          title,
          description: f.description.trim(),
          type: f.type,
          file_paths: photos.map(ph => ph.url),
          creation_date: sameDay || !f.creation_date
            ? existing.creation_date
            : new Date(f.creation_date).toISOString(),
          tags: { ...existing.tags, ...f.tags },
          artifact_id: artifactId,
        };
        return {
          ...p,
          artifacts: p.artifacts.map(a => (a.artifact_id === artifactId ? updated : a)),
        };
      });
    }, `Saved “${title}”.`);
    if (ok) setEditingArtefactId(null);
  };

  const handleDeleteStudent = async () => {
    if (!student) return;
    const name = student.name?.display_name || student.student_id;
    const projectCount = (student.projects || []).length;
    const artefactCount = (student.projects || []).reduce((n, p) => n + (p.artifacts || []).length, 0);
    const confirmed = window.confirm(
      `Delete ${name} from the live archive?\n\n` +
        `This also removes their ${projectCount} project${projectCount === 1 ? '' : 's'} and ` +
        `${artefactCount} artefact${artefactCount === 1 ? '' : 's'}. This can't be undone.`
    );
    if (!confirmed) return;
    const ok = await run('Deleting student…', () => deleteStudent(student.student_id), `Deleted ${name}.`);
    // The selection effect then moves to the next student in this year.
    if (ok) setStudentId(null);
  };

  const handleDelete = async artifact => {
    const confirmed = window.confirm(
      `Delete “${artifact.title}” from the live archive?\n\nThis can't be undone.`
    );
    if (!confirmed) return;
    await run(
      'Deleting…',
      () => deleteArtifact(student.student_id, project.project_id, artifact.artifact_id),
      `Deleted “${artifact.title}”.`
    );
  };

  // ── render ──

  const cohortName = COHORTS.find(c => c.value === cohort)?.label;

  const newStudentForm = (
    <form className="edit-form" onSubmit={handleAddStudent}>
      <div className="edit-grid-2">
        <div className="edit-field">
          <label className="edit-label" htmlFor="new-student-first">First name</label>
          <input
            id="new-student-first"
            className="edit-input"
            autoFocus
            value={newStudent.first_name}
            onChange={e => setNewStudent(s => ({ ...s, first_name: e.target.value }))}
            required
          />
        </div>
        <div className="edit-field">
          <label className="edit-label" htmlFor="new-student-last">Last name</label>
          <input
            id="new-student-last"
            className="edit-input"
            value={newStudent.last_name}
            onChange={e => setNewStudent(s => ({ ...s, last_name: e.target.value }))}
          />
        </div>
      </div>
      <div className="edit-field">
        <label className="edit-label" htmlFor="new-student-project">First project title</label>
        <input
          id="new-student-project"
          className="edit-input"
          value={newStudent.project_title}
          onChange={e => setNewStudent(s => ({ ...s, project_title: e.target.value }))}
          required
        />
        <span className="edit-muted">You'll fill in the rest of the project next.</span>
      </div>
      <div className="edit-row">
        <button
          type="submit"
          className="edit-btn edit-btn--primary"
          disabled={!!busy || !newStudent.first_name.trim() || !newStudent.project_title.trim()}
        >
          Add student to {cohortName}
        </button>
        <button type="button" className="edit-link" onClick={() => setNewStudentOpen(false)}>Cancel</button>
      </div>
    </form>
  );

  if (!cmsKey) {
    return (
      <div className="edit-page">
        <Seo title="Edit" path="/edit" noindex />
        <KeyGate error={gateError} onUnlock={unlock} />
      </div>
    );
  }

  return (
    <div className="edit-page">
      <Seo title="Edit" path="/edit" noindex />

      <header className="edit-header">
        <div>
          <h1 className="edit-title">Edit archive</h1>
          <p className="edit-muted">Changes save straight to the live archive ({API_HOST}).</p>
        </div>
        <button
          type="button"
          className="edit-link"
          onClick={() => {
            setCmsKey('');
            setKeyState('');
          }}
        >
          Lock
        </button>
      </header>

      <div className="edit-cohorts" role="tablist" aria-label="Year">
        {COHORTS.map(c => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={cohort === c.value}
            className={clsx('cohort-btn', cohort === c.value && 'cohort-btn--active')}
            onClick={() => setCohort(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {(busy || message) && (
        <div
          className={clsx('edit-status', message?.kind === 'error' && !busy && 'edit-status--error')}
          role="status"
        >
          {busy || message.text}
        </div>
      )}

      {loading ? (
        <p className="edit-muted">Loading archive…</p>
      ) : loadError ? (
        <p className="edit-error">Couldn't load the archive: {loadError.message}</p>
      ) : (
        <div className="edit-layout">
          {/* Students */}
          <section className="edit-col" aria-labelledby="edit-students-h">
            <h2 id="edit-students-h" className="edit-h3 edit-h3--first">Students</h2>
            {cohortStudents.length === 0 && (
              <p className="edit-muted">No students in this year yet.</p>
            )}
            <ul className="edit-list">
              {cohortStudents.map(s => (
                <li key={s.student_id}>
                  <button
                    type="button"
                    className={clsx('edit-list-btn', s.student_id === studentId && 'is-active')}
                    onClick={() => setStudentId(s.student_id)}
                  >
                    {s.name?.display_name || s.student_id}
                  </button>
                </li>
              ))}
            </ul>

            {!newStudentOpen && (
              <button type="button" className="edit-btn edit-btn--add-student" onClick={() => setNewStudentOpen(true)}>
                Add student
              </button>
            )}
          </section>

          {/* Projects + artefacts */}
          <section className="edit-col edit-col--main" aria-labelledby="edit-projects-h">
            {newStudentOpen && student ? (
              <>
                <h2 id="edit-projects-h" className="edit-h3 edit-h3--first">New student</h2>
                <p className="edit-muted">They'll be added to {cohortName}.</p>
                <div className="edit-box edit-box--padded edit-box--spaced">{newStudentForm}</div>
              </>
            ) : !student ? (
              <>
                <h2 id="edit-projects-h" className="edit-h3 edit-h3--first">Getting started</h2>
                <p className="edit-muted">
                  No one has been added to {cohortName} yet. Start with a student,
                  then fill in their project and add its artefacts.
                </p>

                <h3 className="edit-h3">Student</h3>
                {newStudentOpen ? (
                  <div className="edit-box edit-box--padded">{newStudentForm}</div>
                ) : (
                  <div className="edit-box">
                    <GhostRow
                      step="1"
                      title="Add a student"
                      hint="Their name and the title of their first project"
                      onClick={() => setNewStudentOpen(true)}
                    />
                  </div>
                )}

                <h3 className="edit-h3">Projects</h3>
                <div className="edit-box">
                  <GhostRow
                    step="2"
                    disabled
                    title="Fill in project details"
                    hint="Subtitle, description, website and photos — after step 1"
                  />
                </div>

                <h3 className="edit-h3">Artefacts</h3>
                <div className="edit-box">
                  <GhostRow
                    step="3"
                    disabled
                    title="Add artefacts"
                    hint="Title, photos and tags — after step 2"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="edit-student-head">
                  <h2 id="edit-projects-h" className="edit-h3 edit-h3--first">{student.name?.display_name}</h2>
                  <button
                    type="button"
                    className="edit-danger-link"
                    disabled={!!busy}
                    onClick={handleDeleteStudent}
                  >
                    <Trash2 size={14} /> Delete student
                  </button>
                </div>
                <h3 className="edit-h3">
                  {student.name?.first_name || student.name?.display_name}’s projects
                </h3>
                <div className="edit-box">
                  <ul className="edit-projects-list">
                    {(student.projects || []).map(p => {
                      const active = p.project_id === projectId && !newProjectOpen;
                      const editing = active && projectEditOpen;
                      const photoCount = (p.project_photos || []).length;
                      const artefactCount = (p.artifacts || []).length;
                      const cover = p.project_photos?.[0]?.url || p.artifacts?.[0]?.file_paths?.[0];
                      return (
                        <li key={p.project_id} className={clsx('edit-project-item', active && 'is-active')}>
                          <div className="edit-project-row">
                            <button
                              type="button"
                              className="edit-project-select"
                              aria-pressed={active}
                              onClick={() => {
                                setProjectId(p.project_id);
                                setNewProjectOpen(false);
                              }}
                            >
                              <span className="edit-thumb">
                                {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="edit-muted">No photo</span>}
                              </span>
                              <span className="edit-artefact-body">
                                <span className="edit-artefact-title">{p.title || p.project_id}</span>
                                <span className="edit-muted edit-row-meta">
                                  {p.subtitle ? `${p.subtitle} · ` : ''}
                                  {photoCount} photo{photoCount === 1 ? '' : 's'} · {artefactCount} artefact
                                  {artefactCount === 1 ? '' : 's'}
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              className="edit-link edit-row-action"
                              aria-expanded={editing}
                              onClick={() => {
                                setNewProjectOpen(false);
                                if (active) {
                                  setProjectEditOpen(o => !o);
                                } else {
                                  openDetailsFor.current = p.project_id;
                                  setProjectId(p.project_id);
                                }
                              }}
                            >
                              {editing ? 'Close' : 'Edit details'}
                            </button>
                          </div>
                          {editing && (
                            <div className="edit-row-form">
                              <ProjectForm
                                idPrefix={`project-${p.project_id}`}
                                initial={p}
                                submitLabel="Save project"
                                disabled={!!busy}
                                onSubmit={handleSaveProject}
                                onCancel={() => setProjectEditOpen(false)}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!newProjectOpen && (
                    <GhostRow
                      title="Add project"
                      hint="Title, description and photos"
                      onClick={() => setNewProjectOpen(true)}
                    />
                  )}
                </div>

                {newProjectOpen && (
                  <div className="edit-box edit-box--form">
                    <h3 className="edit-h3">New project for {student.name?.display_name}</h3>
                    <ProjectForm
                      idPrefix="new-project"
                      initial={NEW_PROJECT}
                      submitLabel="Add project"
                      disabled={!!busy}
                      onSubmit={handleAddProject}
                      onCancel={() => setNewProjectOpen(false)}
                    />
                  </div>
                )}

                {!project && !newProjectOpen && (
                  <>
                    <h3 className="edit-h3">Artefacts</h3>
                    <div className="edit-box">
                      <GhostRow disabled title="Add artefacts" hint="Add a project first" />
                    </div>
                  </>
                )}

                {project && !newProjectOpen && (
                  <>
                    <h3 className="edit-h3">Artefacts in “{project.title}”</h3>
                    <div className="edit-box">
                    {(project.artifacts || []).length === 0 ? (
                      artefactFormOpen && <p className="edit-muted edit-box-empty">No artefacts yet.</p>
                    ) : (
                      <ul className="edit-artefacts">
                        {project.artifacts.map(a => {
                          const editing = editingArtefactId === a.artifact_id;
                          return (
                            <li key={a.artifact_id} className="edit-artefact-item">
                              <div className="edit-artefact edit-artefact--row">
                                <div className="edit-thumb">
                                  {a.file_paths?.[0] ? (
                                    <img src={a.file_paths[0]} alt="" loading="lazy" />
                                  ) : (
                                    <span className="edit-muted">No photo</span>
                                  )}
                                </div>
                                <div className="edit-artefact-body">
                                  <div className="edit-artefact-title">{a.title}</div>
                                  <div className="edit-muted">
                                    {humanize(a.type)} · {(a.file_paths || []).length} photo
                                    {(a.file_paths || []).length === 1 ? '' : 's'} ·{' '}
                                    {TAG_FIELDS.reduce((n, f) => n + (a.tags?.[f.key]?.length || 0), 0)} tags
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="edit-link edit-row-action"
                                  aria-expanded={editing}
                                  onClick={() => {
                                    setArtefactFormOpen(false);
                                    setEditingArtefactId(editing ? null : a.artifact_id);
                                  }}
                                >
                                  {editing ? 'Close' : 'Edit details'}
                                </button>
                                <button
                                  type="button"
                                  className="edit-icon-btn"
                                  aria-label={`Delete ${a.title}`}
                                  title="Delete artefact"
                                  disabled={!!busy}
                                  onClick={() => handleDelete(a)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              {editing && (
                                <div className="edit-row-form">
                                  <ArtefactForm
                                    idPrefix={`artefact-${a.artifact_id}`}
                                    initial={a}
                                    submitLabel="Save artefact"
                                    disabled={!!busy}
                                    typeOptions={typeOptions}
                                    suggestions={suggestions}
                                    onSubmit={f => handleSaveArtefact(a.artifact_id, f)}
                                    onCancel={() => setEditingArtefactId(null)}
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {!artefactFormOpen && (
                      <GhostRow
                        title="Add artefact"
                        hint="Title, photos and tags"
                        onClick={() => {
                          setEditingArtefactId(null);
                          setArtefactFormOpen(true);
                        }}
                      />
                    )}
                    </div>

                    {artefactFormOpen && (
                      <ArtefactForm
                        idPrefix="new-artefact"
                        initial={NEW_ARTEFACT}
                        heading="Add artefact"
                        className="edit-box edit-box--form"
                        submitLabel={`Add artefact to ${student.name?.first_name || 'student'} · ${project.title}`}
                        disabled={!!busy}
                        typeOptions={typeOptions}
                        suggestions={suggestions}
                        onSubmit={handleAddArtefact}
                        onCancel={() => setArtefactFormOpen(false)}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
