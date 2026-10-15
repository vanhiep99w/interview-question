const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = webpack.container;

module.exports = (_env, argv) => {
  const development = argv.mode !== 'production';
  const remoteUrl = process.env.VUE_SUB_URL || (development
    ? 'http://127.0.0.1:5174/remoteEntry.js'
    : 'http://127.0.0.1:4174/remoteEntry.js');

  return {
    context: __dirname,
    mode: development ? 'development' : 'production',
    target: 'web',
    entry: './src/main.tsx',
    // #region output
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      publicPath: 'auto',
      uniqueName: 'routingReactShell',
      crossOriginLoading: 'anonymous',
      clean: true,
    },
    // #endregion output
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    // #region loaders
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: { transpileOnly: true, compilerOptions: { noEmit: false } },
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
    // #endregion loaders
    plugins: [
      new HtmlWebpackPlugin({ template: './index.html', publicPath: '/' }),
      // #region federation
      new ModuleFederationPlugin({
        name: 'reactShell',
        remotes: { vueSub: `vueSub@${remoteUrl}` },
      }),
      // #endregion federation
      // #region constants
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(development),
        __VUE_SUB_URL__: JSON.stringify(remoteUrl),
      }),
      // #endregion constants
    ],
    devtool: development ? 'eval-source-map' : 'source-map',
    stats: 'errors-warnings',
    performance: { hints: false },
    devServer: {
      host: '127.0.0.1',
      port: Number(process.env.PORT || 5173),
      historyApiFallback: true,
      static: false,
      hot: false,
      liveReload: true,
      client: { logging: 'warn' },
      onListening(server) {
        console.log(`WEBPACK_READY http://127.0.0.1:${server.server.address().port}/`);
      },
    },
  };
};
