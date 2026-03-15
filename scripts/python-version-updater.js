// Python __init__.py version updater for standard-version
// Usage: updater: require('./scripts/python-version-updater')

const versionRegex = /__version__ = ['"]([^'"]+)['"]/;

module.exports.readVersion = function (contents) {
  const match = contents.match(versionRegex);
  return match ? match[1] : '0.0.0';
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(versionRegex, `__version__ = "${version}"`);
};
