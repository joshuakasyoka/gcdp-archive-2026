const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.REACT_APP_API_URL ||
  'https://gcdp2025.vercel.app';

// Photos (static files and /edit uploads) live on the live API host. A local
// test API only holds data, so photos keep coming from the live host unless
// MEDIA_PROXY_TARGET says otherwise.
const MEDIA_TARGET = process.env.MEDIA_PROXY_TARGET || 'https://gcdp2025.vercel.app';

module.exports = function(app) {
  const options = target => ({
    target,
    changeOrigin: true,
    secure: true,
    proxyTimeout: 60000,
    timeout: 60000,
  });
  // Photos uploaded through /edit are served from the live database too.
  app.use('/api/media', createProxyMiddleware(options(MEDIA_TARGET)));
  app.use('/api', createProxyMiddleware(options(API_TARGET)));
  app.use('/uploads', createProxyMiddleware(options(MEDIA_TARGET)));
  app.use('/StudentPhotos', createProxyMiddleware(options(MEDIA_TARGET)));
};
