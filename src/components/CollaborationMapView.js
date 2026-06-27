import React, { useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { initMapbox, getMapboxToken } from '../mapboxSetup';
import 'mapbox-gl/dist/mapbox-gl.css';
import './CollaborationMapView.css';

const mapboxgl = initMapbox();

export default function CollaborationMapView({ entries, mapPins }) {
  const containerRef = useRef(null);

  const pinData = useMemo(() => {
    const results = [];
    for (const pin of mapPins) {
      const linkedProjects = [];
      for (const entry of entries) {
        for (const project of entry.projects || []) {
          const hasPin = project.artifacts?.some(a => a.pin_id === pin.pin_id);
          if (hasPin && !linkedProjects.some(p => p.project_id === project.project_id)) {
            linkedProjects.push(project);
          }
        }
      }
      if (linkedProjects.length > 0) {
        results.push({ pin, projects: linkedProjects });
      }
    }
    return results;
  }, [entries, mapPins]);

  useEffect(() => {
    if (!containerRef.current || !getMapboxToken()) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [10, 30],
      zoom: 1.2,
      projection: 'globe',
      attributionControl: false,
    });

    map.on('load', () => {
      map.resize();
      map.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(255, 255, 255)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(255, 255, 255)',
        'star-intensity': 0,
      });
      for (const { pin } of pinData) {
        const el = document.createElement('div');
        el.className = 'collab-map-pin';
        el.innerHTML = '<div class="collab-map-pin-dot"></div>';

        new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [pinData]);

  return (
    <div className="collab-map-view">
      {!getMapboxToken() && (
        <div className="collab-map-error">Map unavailable — Mapbox token not configured.</div>
      )}
      <div ref={containerRef} className="collab-map-container" />
      {pinData.length > 0 && (
        <div className="collab-map-legend">
          {pinData.map(({ pin, projects }) => (
            <div key={pin.pin_id} className="collab-map-legend-item">
              <strong>{pin.title}</strong>
              {projects.map(project => (
                <Link key={project.project_id} to={`/projects/${project.project_id}`} className="collab-map-legend-link">
                  {project.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
