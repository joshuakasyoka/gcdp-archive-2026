import React, { useState } from 'react';
import clsx from 'clsx';
import './ProgressiveImage.css';

export default function ProgressiveImage({
  src,
  alt = '',
  className,
  loading = 'lazy',
  decoding = 'async',
}) {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={clsx('progressive-image', loaded && 'progressive-image--loaded', className)}
      onLoad={() => setLoaded(true)}
    />
  );
}
