module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": false,
        "os": false,
        "crypto": false,
        "fs": false,
        "stream": false,
        "http": false,
        "https": false,
        "zlib": false,
        "url": false
      };
      
      return webpackConfig;
    },
  },
};
