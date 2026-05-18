const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withAndroidPackagingFix(config) {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    const marker = "META-INF/versions/9/OSGI-INF/MANIFEST.MF";
    if (!modResults.contents.includes(marker)) {
      modResults.contents = modResults.contents.replace(
        /^(android\s*\{)/m,
        `$1\n    packaging {\n        resources {\n            excludes += ['${marker}']\n        }\n    }`
      );
    }
    return config;
  });
};
