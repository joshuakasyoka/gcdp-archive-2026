import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-hero">
        <img
          className="landing-hero-image"
          src={`${process.env.PUBLIC_URL}/banner.jpg`}
          alt=""
        />
      </div>

      <div className="landing-about">
        <div className="landing-about-col">
          <h2 className="landing-about-title">About the archive</h2>
          <p className="landing-about-text">
            This archive is a living record of the work produced by students of the MA Global
            Collaborative Design Practice: a growing collection of projects, artefacts, methods, and
            collaborations that spans cohorts and continues to expand with each graduating year. It is
            built to outlast any single show or semester: a shared infrastructure for students, alumni,
            tutors, and anyone curious about what design practice can look like when it takes social and
            ecological challenges seriously. Browse by project, by theme, by material, or by the places
            across London and Kyoto where this work has taken root.
          </p>
          <div className="landing-ctas">
            <Link to="/artefacts" className="cta-btn">Explore Artefacts</Link>
            <Link to="/projects" className="cta-btn">Explore Projects</Link>
            <Link to="/students" className="cta-btn">Explore Students</Link>
          </div>
        </div>

        <div className="landing-about-col">
          <h2 className="landing-about-title">About the programme</h2>
          <p className="landing-about-text">
            <strong>MA Global Collaborative Design Practice</strong> is a two-year postgraduate programme jointly
            run by the University of the Arts London and the Kyoto Institute of Technology. It brings
            together two cohorts of students — one based in London, one in Kyoto — who spend significant
            time studying at both institutions, working in cross-cultural teams across disciplines that
            span design, engineering, science, and the humanities. The programme asks how design practice
            can move beyond the creative industries to address the critical challenges of our time:
            climate change, social and racial inequality, civic disengagement. Students graduate with dual
            degrees, an MA from UAL and an MEng from KIT, and a practice grounded in collaboration,
            fieldwork, making, and speculative thinking.
          </p>
          <a
            href="https://www.arts.ac.uk/subjects/communication-and-graphic-design/postgraduate/ma-global-collaborative-design-practice-camberwell"
            target="_blank"
            rel="noreferrer"
            className="landing-learn-more"
          >
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}
