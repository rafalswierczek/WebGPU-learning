const path = require("path");
const TexturesZipPlugin = require("./tools/TexturesZipPlugin");
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
    plugins: [
        new TexturesZipPlugin({
            sourceDir: path.join(__dirname, "assets", "Textures"),
            outputFile: path.join(__dirname, "public", "assets", "textures.zip"),
        })
    ],
    watchOptions: {
        poll: 1000
    }
};
