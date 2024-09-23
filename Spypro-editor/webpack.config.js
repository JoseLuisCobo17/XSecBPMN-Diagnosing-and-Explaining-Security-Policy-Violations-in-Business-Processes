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
      viewer: './example/src/viewer.js',
      modeler: './example/src/modeler.js'
    },
    output: {
      filename: 'dist/[name].js',
      path: path.resolve(__dirname, 'example'),
      clean: true // Limpia los archivos viejos antes de generar nuevos bundles
    },
    module: {
      rules: [
        {
          test: /\.bpmn$/,
          type: 'asset/source' // Permite importar archivos .bpmn como cadenas de texto
        },
        {
          test: /\.json$/,
          type: 'json', // Para manejar archivos JSON (como moddle descriptors)
          parser: {
            parse: JSON.parse
          }
        },
        {
          test: /\.css$/,
          use: [ 'style-loader', 'css-loader'] // Para manejar archivos CSS
        },
        {
          test: /\.less$/,
          use: [ 'style-loader', 'css-loader', 'less-loader'] // Para manejar archivos Less (si usas Less)
        }
      ]
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
    devtool: isDevMode ? 'eval-source-map' : 'source-map', // Source maps más rápidos en desarrollo
    devServer: {
      static: path.join(__dirname, 'example'), // Carpeta donde buscará archivos estáticos
      compress: true,
      port: 9000, // Puerto para tu servidor de desarrollo
      hot: true, // Habilita hot reloading para desarrollo
      open: true // Abre automáticamente en el navegador
    }
  };

};