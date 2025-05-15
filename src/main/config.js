require('dotenv').config();
const packageJson = require('../../package.json');

module.exports = {
  app_name: process.env.APP_NAME || packageJson.name,
  version: process.env.VERSION || packageJson.version,
  channel: process.env.CHANNEL || "nightly",
  owner: process.env.OWNER || "admin",
};