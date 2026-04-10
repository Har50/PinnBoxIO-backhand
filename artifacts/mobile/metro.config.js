const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /protobufjs_tmp.*/,
  /node_modules\/.*\/protobufjs_tmp.*/,
];

module.exports = config;
