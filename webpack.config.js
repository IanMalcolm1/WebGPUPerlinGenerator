const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    entry: "./src/main.js",
    optimization: {
        minimize: false
    },
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "main.js"
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "shaders", to: "shaders" },
                { from: "html", to: "." },
            ],
        }),
    ],
}