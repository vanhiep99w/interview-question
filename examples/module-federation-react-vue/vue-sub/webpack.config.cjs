const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const { ModuleFederationPlugin } = webpack.container;
const pkg = require('./package.json');

module.exports = (_env, argv) => {
  const development = argv.mode !== 'production';
  const shellOrigins = [
    'http://127.0.0.1:5173', 'http://localhost:5173',
    'http://127.0.0.1:4173', 'http://localhost:4173',
    process.env.SHELL_ORIGIN,
  ].filter(Boolean);

  return {
    context: __dirname,
    mode: development ? 'development' : 'production',
    target: 'web',
    entry: './src/main.ts',
    // #region output
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      publicPath: 'auto',
      uniqueName: 'routingVueSub',
      crossOriginLoading: 'anonymous',
      clean: true,
    },
    // #endregion output
    resolve: {
      extensions: ['.ts', '.js', '.vue'],
      alias: { 'vue$': 'vue/dist/vue.runtime.esm-bundler.js' },
    },
    // #region loaders
    module: {
      rules: [
        { test: /\.vue$/, loader: 'vue-loader' },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
    // #endregion loaders
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({ template: './index.html', publicPath: '/' }),
      // #region federation
      new ModuleFederationPlugin({
        name: 'vueSub',
        filename: 'remoteEntry.js',
        exposes: { './mount': './src/mount.ts' },
        shared: {
          vue: { singleton: true, requiredVersion: pkg.dependencies.vue },
          'vue-router': { singleton: true, requiredVersion: pkg.dependencies['vue-router'] },
        },
      }),
      // #endregion federation
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      }),
    ],
    devtool: development ? 'eval-source-map' : 'source-map',
    stats: 'errors-warnings',
    performance: { hints: false },
    // #region dev-server
    devServer: {
      host: '127.0.0.1',
      port: Number(process.env.PORT || 5174),
      historyApiFallback: true,
      static: false,
      hot: false,
      liveReload: true,
      client: { logging: 'warn' },
      headers(req) {
        const origin = req.headers.origin;
        return shellOrigins.includes(origin)
          ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
          : { Vary: 'Origin' };
      },
      onListening(server) {
        console.log(`WEBPACK_READY http://127.0.0.1:${server.server.address().port}/`);
      },
    },
    // #endregion dev-server
  };
};
