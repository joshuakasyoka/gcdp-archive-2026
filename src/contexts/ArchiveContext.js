import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchStudents, fetchMapPins, fetchGlossary } from '../services/api';

const ArchiveContext = createContext(null);

function flattenArtefacts(students) {
  const artefacts = [];
  for (const student of students) {
    for (const project of student.projects || []) {
      for (const artifact of project.artifacts || []) {
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
  for (const student of students) {
    for (const project of student.projects || []) {
      projects.push({ ...project, _student: student });
    }
  }
  return projects;
}

function buildGlossary(artefacts) {
  const groups = {
    Themes: new Set(),
    'Design As': new Set(),
    Materials: new Set(),
    Methods: new Set(),
    Collaborators: new Set(),
  };
  const keyMap = {
    themes: 'Themes',
    design_as: 'Design As',
    materials: 'Materials',
    methods: 'Methods',
    collaborators: 'Collaborators',
  };
  for (const a of artefacts) {
    for (const [k, label] of Object.entries(keyMap)) {
      for (const term of a.tags?.[k] || []) {
        if (term) groups[label].add(term);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, [...v].sort()])
  );
}

export function ArchiveProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [artefacts, setArtefacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [glossary, setGlossary] = useState({});
  const [glossaryDefinitions, setGlossaryDefinitions] = useState({});
  const [mapPins, setMapPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchMapPins(), fetchGlossary()])
      .then(([studs, pins, glossaryTerms]) => {
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
        setGlossary(buildGlossary(arts));
        setGlossaryDefinitions(defs);
        setMapPins(pins);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ArchiveContext.Provider value={{ students, artefacts, projects, glossary, glossaryDefinitions, mapPins, loading, error }}>
      {children}
    </ArchiveContext.Provider>
  );
}

export function useArchive() {
  return useContext(ArchiveContext);
}
