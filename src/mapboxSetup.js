import mapboxgl from 'mapbox-gl';

// CRA production builds need the CSP worker served from /public instead of a blob worker.
mapboxgl.workerUrl = `${process.env.PUBLIC_URL}/mapbox-gl-csp-worker.js`;

export function getMapboxToken() {
  return process.env.REACT_APP_MAPBOX_TOKEN || '';
}

export function initMapbox() {
  mapboxgl.accessToken = getMapboxToken();
  return mapboxgl;
}
