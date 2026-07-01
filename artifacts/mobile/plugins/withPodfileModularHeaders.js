const { withPodfile } = require("expo/config-plugins");

module.exports = function withPodfileModularHeaders(config) {
  return withPodfile(config, (config) => {
    if (config.modResults.contents.includes("use_modular_headers!")) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      "target 'PinnboxIO' do",
      "use_modular_headers!\ntarget 'PinnboxIO' do"
    );
    return config;
  });
};
