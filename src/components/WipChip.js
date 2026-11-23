import React from 'react';
import './WipChip.css';

// Small grey outline chip marking a year that's still work in progress.
export default function WipChip({ className = '' }) {
  return (
    <span className={`wip-chip ${className}`.trim()} title="Work in progress">
      WIP
    </span>
  );
}
