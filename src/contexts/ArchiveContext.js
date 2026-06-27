import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchStudents, fetchMapPins, fetchGlossary } from '../services/api';

const ArchiveContext = createContext(null);

const COHORT_STORAGE_KEY = 'gcdp_cohort_filter';

function readStoredCohort() {
  try {
    const raw = localStorage.getItem(COHORT_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeTitle(title) {
  return (title || '').trim().toLowerCase();
}

function flattenArtefacts(students) {
  const artefacts = [];
  const seen = new Set();
  for (const student of students) {
    for (const project of student.projects || []) {
      for (const artifact of project.artifacts || []) {
        const key = normalizeTitle(artifact.title);
        if (!key || key === 'zine template prototype' || seen.has(key)) continue;
        seen.add(key);
        artefacts.push({
          ...artifact,
          _student: student,
          _project: project,
        });
      }
    }
  }
  return artefacts;
}

function flattenProjects(students) {
  const projects = [];
  const byTitle = new Map();
  for (const student of students) {
    for (const project of student.projects || []) {
      const key = normalizeTitle(project.title);
      if (!key || key === 'untitled project') continue;

      const existing = byTitle.get(key);
      if (!existing) {
        const merged = {
          ...project,
          artifacts: [...(project.artifacts || [])],
          project_photos: [...(project.project_photos || [])],
          _student: student,
          _students: [student],
        };
        byTitle.set(key, merged);
        projects.push(merged);
        continue;
      }

      // Same-titled project owned by another collaborating student — merge in
      // their unique artefacts/photos instead of discarding their contribution.
      existing._students.push(student);

      const seenArtTitles = new Set(existing.artifacts.map(a => normalizeTitle(a.title)));
      for (const art of project.artifacts || []) {
        const artKey = normalizeTitle(art.title);
        if (artKey && !seenArtTitles.has(artKey)) {
          seenArtTitles.add(artKey);
          existing.artifacts.push({ ...art, _student: student });
        }
      }

      const seenPhotoUrls = new Set(existing.project_photos.map(p => p.url));
      for (const photo of project.project_photos || []) {
        if (photo.url && !seenPhotoUrls.has(photo.url)) {
          seenPhotoUrls.add(photo.url);
          existing.project_photos.push(photo);
        }
      }
    }
  }
  return projects;
}

const GLOSSARY_CATEGORY_LABELS = {
  themes: 'Themes',
  design_as: 'Design As',
  materials: 'Materials',
  methods: 'Methods',
  collaborators: 'Collaborators',
};

function buildGlossary(glossaryTerms, artefacts) {
  const groups = {
    Themes: new Set(),
    'Design As': new Set(),
    Materials: new Set(),
    Methods: new Set(),
    Collaborators: new Set(),
  };
  for (const entry of glossaryTerms || []) {
    const label = GLOSSARY_CATEGORY_LABELS[entry?.category];
    if (label && entry.term) groups[label].add(entry.term);
  }
  for (const a of artefacts) {
    for (const [key, label] of Object.entries(GLOSSARY_CATEGORY_LABELS)) {
      for (const term of a.tags?.[key] || []) {
        if (term) groups[label].add(term);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, [...v].sort()])
  );
}

function buildGlossarySources(artefacts) {
  const sources = {};
  for (const a of artefacts) {
    for (const key of Object.keys(GLOSSARY_CATEGORY_LABELS)) {
      for (const term of a.tags?.[key] || []) {
        if (!term) continue;
        if (!sources[term]) sources[term] = new Map();
        const projectId = a._project?.project_id || a._project?.title;
        if (projectId && !sources[term].has(projectId)) {
          sources[term].set(projectId, {
            studentId: a._student?.student_id,
            studentName: a._student?.name?.display_name,
            projectId: a._project?.project_id,
            projectTitle: a._project?.title,
          });
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(sources).map(([term, m]) => [term, [...m.values()]])
  );
}

export function ArchiveProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [artefacts, setArtefacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [glossary, setGlossary] = useState({});
  const [glossaryDefinitions, setGlossaryDefinitions] = useState({});
  const [glossarySources, setGlossarySources] = useState({});
  const [collaboratorLinks, setCollaboratorLinks] = useState({});
  const [mapPins, setMapPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cohort, setCohortState] = useState(readStoredCohort);

  const setCohort = (value) => {
    setCohortState(value);
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(COHORT_STORAGE_KEY);
      } else {
        localStorage.setItem(COHORT_STORAGE_KEY, JSON.stringify(value));
      }
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  };

  useEffect(() => {
    Promise.all([
      fetchStudents(),
      fetchMapPins(),
      fetchGlossary(),
      fetch('/collaboratorLinks.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([studs, pins, glossaryTerms, links]) => {
        const arts = flattenArtefacts(studs);
        const defs = {};
        for (const entry of glossaryTerms || []) {
          if (entry?.term && entry?.definition) {
            defs[entry.term] = entry.definition;
          }
        }
        setStudents(studs);
        setArtefacts(arts);
        setProjects(flattenProjects(studs));
        setGlossary(buildGlossary(glossaryTerms, arts));
        setGlossaryDefinitions(defs);
        setGlossarySources(buildGlossarySources(arts));
        setCollaboratorLinks(links || {});
        setMapPins(pins);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ArchiveContext.Provider value={{ students, artefacts, projects, glossary, glossaryDefinitions, glossarySources, collaboratorLinks, mapPins, loading, error, cohort, setCohort }}>
      {children}
    </ArchiveContext.Provider>
  );
}

export function useArchive() {
  return useContext(ArchiveContext);
}
