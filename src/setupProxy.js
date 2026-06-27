const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.REACT_APP_API_URL ||
  'https://gcdp2025.vercel.app';

module.exports = function(app) {
  const proxy = {
    target: API_TARGET,
    changeOrigin: true,
    secure: true,
    proxyTimeout: 60000,
    timeout: 60000,
  };
  app.use('/api', createProxyMiddleware(proxy));
  app.use('/uploads', createProxyMiddleware(proxy));
  app.use('/StudentPhotos', createProxyMiddleware(proxy));
};
