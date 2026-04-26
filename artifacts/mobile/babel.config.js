module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test";
  return {
    presets: [
      [
        "babel-preset-expo",
        isTest ? {} : { unstable_transformImportMeta: true },
      ],
    ],
    plugins: isTest ? [] : ["react-native-reanimated/plugin"],
  };
};
