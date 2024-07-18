const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/app.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      'process': 'process/browser',
    },
    fallback: {
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "buffer": require.resolve("buffer"),
      "stream": require.resolve("stream-browserify"),
      "timers": require.resolve("timers-browserify"),
      "url": require.resolve("url"),
      "assert": require.resolve("assert"),
      "crypto": require.resolve("crypto-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader',
        ],
      },
      {
        test: /\.bpmn$/,
        use: 'raw-loader'
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.MY_ENV': JSON.stringify(process.env.MY_ENV),
    }),
  ],
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    hot: true,
  }
};
