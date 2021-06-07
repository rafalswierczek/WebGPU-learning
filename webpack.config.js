const path = require("path");
const bundleOutputDir = "./dist/build";

module.exports = {
    entry: {
        main: "./src/ts/index"  
    },
    output: {
        filename: "[name].bundle.js",
        path: path.join(__dirname, bundleOutputDir),
        publicPath: 'public/dist',
        clean: true
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },            
            { test: /\.tsx?$/, loader: "ts-loader" },        
            {
                test: /\.css$/,
                sideEffects: true,
                loader: "css-loader"
            }
        ]
    }
};