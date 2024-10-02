/* eslint-env node */
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const isDevMode = mode === 'development';

  return {
    mode,
    entry: {
      viewer: './example/src/viewer.js', // Archivo de entrada para el visor
      modeler: './example/src/modeler.js' // Archivo de entrada para el modelador
    },
    output: {
      filename: 'dist/[name].js',
      path: path.resolve(__dirname, 'example'), // Salida de archivos
      clean: true // Limpia los archivos viejos en cada build
    },
    module: {
      rules: [
        {
          test: /\.bpmn$/,
          type: 'asset/source'
        },
        {
          test: /\.js$/,
          exclude: /node_modules/, // Excluir la carpeta node_modules
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.json$/,
          type: 'json', // Soporte para archivos JSON
          parser: {
            parse: JSON.parse
          }
        },
        {
          test: /\.css$/,
          use: [ 'style-loader', 'css-loader' ] // Carga archivos CSS
        },
        {
          test: /\.less$/,
          use: [ 'style-loader', 'css-loader', 'less-loader' ] // Carga archivos LESS
        }
      ]
    },
    resolve: {
      fallback: {
        fs: false,
        path: require.resolve('path-browserify'), // Soporte para path en el navegador
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
      }
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: './assets', to: 'dist/vendor/bpmn-js-token-simulation/assets' },
          { from: 'bpmn-js/dist/assets', context: 'node_modules', to: 'dist/vendor/bpmn-js/assets' },
          { from: '@bpmn-io/properties-panel/dist/assets', context: 'node_modules', to: 'dist/vendor/bpmn-js-properties-panel/assets' }
        ]
      }),
      new DefinePlugin({
        'process.env.TOKEN_SIMULATION_VERSION': JSON.stringify(require('./package.json').version)
      })
    ],
    devtool: isDevMode ? 'eval-source-map' : 'source-map',
    devServer: {
      static: path.join(__dirname, 'example'),
      compress: true,
      port: 9000,
      hot: true,
      open: true
    }
  };
};