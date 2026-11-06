const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
// The apps keep their dependency trees. Only the dependency-free rules outside
// this project need to be visible to Metro.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, "../shared")];

module.exports = config;
