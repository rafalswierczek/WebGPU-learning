const path = require("path");
const bundleOutputDir = "./public/build";

module.exports = {
    mode: 'development',
    entry: {
        main: "./src/ts/index.ts"  
    },
    output: {
        filename: "[name].bundle.js",
        path: path.join(__dirname, bundleOutputDir),
        publicPath: './public',
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
            {
                test: /\.ts$/,
                loader: "ts-loader",
                options: {
                    configFile: path.resolve(__dirname, "tsconfig.json")
                }
            },
            {
                test: /\.wgsl$/,
                loader: 'ts-shader-loader'
            }
        ]
    },
    watchOptions: {
        poll: 1000
    }
};
