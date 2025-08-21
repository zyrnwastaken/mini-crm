/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Enable the API directory for serverless functions.
  // The basePath is left default. Vercel will automatically detect and deploy
  // the API routes found in the `/pages/api` directory.
};

module.exports = nextConfig;
