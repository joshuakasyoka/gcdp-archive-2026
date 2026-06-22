import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ArchiveProvider } from './contexts/ArchiveContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ArtefactsPage from './pages/ArtefactsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import GlossaryPage from './pages/GlossaryPage';
import AboutPage from './pages/AboutPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ArchiveProvider>
        <div className="app">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/artefacts" element={<ArtefactsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ArchiveProvider>
    </BrowserRouter>
  );
}
