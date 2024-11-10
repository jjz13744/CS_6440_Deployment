module.exports = {
  // ... other webpack configurations
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader',
        type: 'javascript/auto'
      },
      // ... other rules
    ]
  }
}; 