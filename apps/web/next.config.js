/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude monaco-editor, yjs, and webcontainer packages from SSR bundling
  // These packages access browser-only APIs (window, document) at module load time
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling these packages on the server
      // They will only be loaded on the client via dynamic imports
      config.externals = [
        ...config.externals,
        'monaco-editor',
        '@monaco-editor/react',
        'yjs',
        'y-monaco',
        'y-websocket',
        'y-protocols',
        '@webcontainer/api',
        '@xterm/xterm',
        '@xterm/addon-fit',
        '@xterm/addon-web-links',
      ];
    }
    return config;
  },

  // Required headers for WebContainers (SharedArrayBuffer support)
  // These enable cross-origin isolation needed for WebAssembly threading
  async headers() {
    return [
      {
        // Apply to workspace routes where terminal is used
        source: '/workspace/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Suppress experimental warnings
  experimental: {
    // Enable server actions if needed
  },
};

module.exports = nextConfig;
