/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ];
  },
  webpack(config) {
    return config;
  },
  env: {
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  },
};

// For Vercel, we need to use environment variables to configure the serverless function
if (process.env.VERCEL) {
  console.log('Running on Vercel, using Vercel-specific configuration');
}

export default nextConfig;
