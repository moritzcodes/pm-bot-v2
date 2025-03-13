module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '950mb' // Setting slightly below 1GB to account for overhead
    },
    responseLimit: '950mb'
  },
  // ... other config options
};