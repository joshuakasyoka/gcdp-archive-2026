export const SITE_URL = (
  process.env.REACT_APP_SITE_URL || 'https://gcdp-archive-2026.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'MA GCDP Digital Archive';

export const DEFAULT_DESCRIPTION =
  'A living digital archive of projects, artefacts, methods, and collaborations from the MA Global Collaborative Design Practice — a joint postgraduate programme between UAL and Kyoto Institute of Technology.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/banner.jpg`;
