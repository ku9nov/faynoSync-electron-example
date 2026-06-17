require('dotenv').config();

const hasAppleCreds = Boolean(
  process.env.APPLE_ID &&
    process.env.APPLE_APP_SPECIFIC_PASSWORD &&
    process.env.APPLE_TEAM_ID
);

module.exports = {
  appId: 'com.faynosync.electronexample',
  productName: 'FaynoSync',
  files: ['src/**/*', 'main.js', 'package.json'],
  directories: {
    buildResources: 'assets',
  },
  afterAllArtifactBuild: 'scripts/notarize-artifacts.cjs',
  mac: {
    target: ['dmg', 'zip'],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: hasAppleCreds ? { teamId: process.env.APPLE_TEAM_ID } : false,
  },
  dmg: {
    sign: true,
  },
  win: {
    target: ['nsis', 'zip'],
  },
  linux: {
    target: ['AppImage', 'deb'],
  },
};
