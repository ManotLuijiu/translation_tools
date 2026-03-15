// Standard Version Configuration
// https://github.com/conventional-changelog/standard-version

module.exports = {
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'chore', section: '🔧 Maintenance', hidden: false },
    { type: 'docs', section: '📚 Documentation' },
    { type: 'style', section: '💄 Styling' },
    { type: 'refactor', section: '♻️ Code Refactoring' },
    { type: 'perf', section: '⚡ Performance Improvements' },
    { type: 'test', section: '✅ Tests' },
    { type: 'build', section: '📦 Build System' },
    { type: 'ci', section: '👷 CI/CD' }
  ],
  bumpFiles: [
    {
      filename: 'package.json',
      type: 'json'
    },
    {
      filename: 'translation_tools/__init__.py',
      updater: './scripts/python-version-updater.js'
    }
  ],
  packageFiles: [
    {
      filename: 'package.json',
      type: 'json'
    }
  ],
  tagPrefix: 'v',
  commitUrlFormat: 'https://github.com/ManotLuijiu/translation_tools/commit/{{hash}}',
  compareUrlFormat: 'https://github.com/ManotLuijiu/translation_tools/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: 'https://github.com/ManotLuijiu/translation_tools/issues/{{id}}',
  userUrlFormat: 'https://github.com/{{user}}',
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  header: `# Changelog

All notable changes to Translation Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`,
  skip: {
    bump: false,
    changelog: false,
    commit: false,
    tag: false
  }
};
