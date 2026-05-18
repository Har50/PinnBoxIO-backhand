const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "META-INF/versions/9/OSGI-INF/MANIFEST.MF";

const BLOCK = `
    packagingOptions {
        resources {
            excludes += ['${MARKER}']
        }
    }`;

module.exports = function withAndroidPackagingFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }
    // Insert immediately after the first `android {` opening brace
    config.modResults.contents = config.modResults.contents.replace(
      "android {",
      `android {${BLOCK}`
    );
    return config;
  });
};
