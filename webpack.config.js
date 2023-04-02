const path = require('path');

module.exports = {
  mode: "production",
  devtool: "inline-source-map",
  entry: {
    main: "./src/shell.ts",
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "shell-bundle.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
};
