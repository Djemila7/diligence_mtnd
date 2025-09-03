/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Charger explicitement les variables d'environnement pour le client
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_BACKEND_URL 
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`
          : 'http://localhost:3003/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;