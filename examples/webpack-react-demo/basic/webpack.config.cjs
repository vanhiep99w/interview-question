const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (_env, argv) => {
  const development = argv.mode !== 'production';

  return {
    context: __dirname,
    mode: development ? 'development' : 'production',
    target: 'web',

    // 1. Bắt đầu đọc code ứng dụng từ file này.
    // #region entry
    entry: './src/main.tsx',
    // #endregion entry

    // 2. Các file build sẽ được đặt tên và xuất ra đây.
    // #region output
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      publicPath: 'auto',
      clean: true,
    },
    // #endregion output

    // 3. Cho phép import './App' mà không ghi './App.tsx'.
    // #region resolve
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    // #endregion resolve

    // 4. Cách chuyển đổi từng loại file trong dependency graph.
    // #region loaders
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    // #endregion loaders

    // 5. Tạo HTML và thêm script tới bundle đúng tên/hash.
    // #region html
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        publicPath: '/',
      }),
    ],
    // #endregion html

    devtool: development ? 'eval-source-map' : 'source-map',

    // 6. Chỉ dùng khi chạy webpack serve.
    devServer: {
      host: '127.0.0.1',
      port: 5173,
      static: false,
      historyApiFallback: true,
      hot: false,
      liveReload: true,
    },
  };
};
