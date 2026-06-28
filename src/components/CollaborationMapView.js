import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { initMapbox, getMapboxToken } from '../mapboxSetup';
import 'mapbox-gl/dist/mapbox-gl.css';
import './CollaborationMapView.css';

const mapboxgl = initMapbox();

function artifactHasPin(artifact, pinId) {
  return artifact.pin_id === pinId || artifact.pin_ids?.includes(pinId);
}

export default function CollaborationMapView({ entries, mapPins }) {
  const containerRef = useRef(null);
  const [selectedPinId, setSelectedPinId] = useState(null);

  const pinData = useMemo(() => {
    const results = [];
    for (const pin of mapPins) {
      const linkedProjects = [];
      for (const entry of entries) {
        for (const project of entry.projects || []) {
          const hasPin = project.artifacts?.some(a => artifactHasPin(a, pin.pin_id));
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
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          setSelectedPinId(pin.pin_id);
        });

        new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [pinData]);

  useEffect(() => {
    setSelectedPinId(null);
  }, [pinData]);

  const selected = pinData.find(({ pin }) => pin.pin_id === selectedPinId);

  return (
    <div className="collab-map-view">
      {!getMapboxToken() && (
        <div className="collab-map-error">Map unavailable — Mapbox token not configured.</div>
      )}
      <div ref={containerRef} className="collab-map-container" />
      {selected && (
        <div className="collab-map-legend">
          <div className="collab-map-legend-item">
            <button
              type="button"
              className="collab-map-legend-close"
              onClick={() => setSelectedPinId(null)}
              aria-label="Close"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
            <strong>{selected.pin.title}</strong>
            {selected.projects.map(project => (
              <Link key={project.project_id} to={`/projects/${project.project_id}`} className="collab-map-legend-link">
                {project.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
