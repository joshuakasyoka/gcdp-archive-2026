import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoomIn, ZoomOut } from 'lucide-react';
import './ArtefactMapView.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

export default function ProjectMapView({ projects, mapPins }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const pinProjects = useMemo(() => {
    const byPin = {};
    for (const pin of mapPins) {
      byPin[pin.pin_id] = {
        pin,
        projects: projects.filter(p =>
          p.artifacts?.some(a => a.pin_id === pin.pin_id)
        ),
      };
    }
    return byPin;
  }, [projects, mapPins]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-0.1, 51.47],
      zoom: 11,
    });

    mapRef.current = map;

    map.on('load', () => {
      for (const { pin, projects: pinProjectsList } of Object.values(pinProjects)) {
        const el = document.createElement('div');
        el.className = 'map-pin';
        el.innerHTML = '<div class="map-pin-dot"></div>';

        new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);

        el.addEventListener('click', () => {
          setSelected({ pin, projects: pinProjectsList });
        });
      }
    });

    return () => map.remove();
  }, [pinProjects]);

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-container" />
      <div className="map-zoom-controls">
        <button className="map-zoom-btn" onClick={() => mapRef.current?.zoomIn()} title="Zoom in">
          <ZoomIn size={16} strokeWidth={1.5} />
        </button>
        <button className="map-zoom-btn" onClick={() => mapRef.current?.zoomOut()} title="Zoom out">
          <ZoomOut size={16} strokeWidth={1.5} />
        </button>
      </div>

      {selected && (
        <div className="map-panel">
          <div className="map-panel-header">
            <strong>{selected.pin.title}</strong>
            <button className="map-panel-close" onClick={() => setSelected(null)}>✕</button>
          </div>
          {selected.pin.description && (
            <p className="map-panel-desc">{selected.pin.description}</p>
          )}
          {selected.projects.length > 0 ? (
            <div className="map-panel-artefacts">
              {selected.projects.map(project => {
                const coverImg = project.project_photos?.[0]?.url || project.artifacts?.[0]?.file_paths?.[0];
                const cohortLabel = project._student?.student_year
                  ? `${project._student.student_year} – ${(project._student.student_year + 1).toString().slice(-2)}`
                  : '';
                return (
                  <Link
                    key={project.project_id}
                    to={`/projects/${project.project_id}`}
                    className="map-panel-item"
                  >
                    {coverImg && (
                      <img src={coverImg} alt={project.title} className="map-panel-thumb" />
                    )}
                    <div>
                      <div className="map-panel-title">{project.title}</div>
                      <div className="map-panel-subtitle">{cohortLabel}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="map-panel-empty">No projects linked to this pin yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
