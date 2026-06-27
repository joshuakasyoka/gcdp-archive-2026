import React from 'react';
import './ViewLoadingFallback.css';

export default function ViewLoadingFallback({ label = 'Loading view…' }) {
  return <div className="view-loading-fallback">{label}</div>;
}
