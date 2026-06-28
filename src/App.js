import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ArchiveProvider } from './contexts/ArchiveContext';
import Navbar from './components/Navbar';
import ArtefactsPage from './pages/ArtefactsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CollaborationsPage from './pages/CollaborationsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import GlossaryPage from './pages/GlossaryPage';
import AboutPage from './pages/AboutPage';
import './App.css';

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ArchiveProvider>
          <div className="app">
            <Navbar />
            <main className="app-main">
              <Routes>
              <Route path="/" element={<ArtefactsPage />} />
              <Route path="/artefacts" element={<Navigate to="/" replace />} />
              <Route path="/artefacts/:artefactId" element={<ArtefactsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/collaborations" element={<CollaborationsPage />} />
              <Route path="/students" element={<Navigate to="/collaborations" replace />} />
              <Route path="/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ArchiveProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
