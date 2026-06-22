import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { initMapbox, getMapboxToken } from '../mapboxSetup';
import 'mapbox-gl/dist/mapbox-gl.css';
import './ArtefactMapView.css';

const mapboxgl = initMapbox();

export default function ArtefactMapView({ artefacts, mapPins, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const pinArtefacts = React.useMemo(() => {
    const byPin = {};
    for (const pin of mapPins) {
      byPin[pin.pin_id] = {
        pin,
        artefacts: artefacts.filter(a => a.pin_id === pin.pin_id),
      };
    }
    return byPin;
  }, [artefacts, mapPins]);

  useEffect(() => {
    if (!containerRef.current || !getMapboxToken()) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-0.1, 51.47],
      zoom: 11,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      for (const { pin, artefacts: pinArts } of Object.values(pinArtefacts)) {
        const el = document.createElement('div');
        el.className = 'map-pin';
        el.innerHTML = '<div class="map-pin-dot"></div>';

        new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);

        el.addEventListener('click', () => {
          setSelected({ pin, artefacts: pinArts });
        });
      }
    });

    return () => map.remove();
  }, [pinArtefacts]);

  return (
    <div className="map-view">
      {!getMapboxToken() && (
        <div className="map-error">Map unavailable — Mapbox token not configured.</div>
      )}
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
          {selected.artefacts.length > 0 ? (
            <div className="map-panel-artefacts">
              {selected.artefacts.map(a => (
                <div key={a.artifact_id} className="map-panel-item" onClick={() => onSelect(a)}>
                  {a.file_paths?.[0] && (
                    <img src={a.file_paths[0]} alt={a.title} className="map-panel-thumb" />
                  )}
                  <div>
                    <div className="map-panel-title">{a.title}</div>
                    <div className="map-panel-subtitle">{a._project?.title}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="map-panel-empty">No artefacts linked to this pin yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
