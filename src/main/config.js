require('dotenv').config();
const packageJson = require('../../package.json');
const baked = packageJson.faynosync || {};

module.exports = {
  app_name: process.env.APP_NAME || baked.appName || packageJson.name,
  version: process.env.VERSION || baked.version || packageJson.version,
  channel: process.env.CHANNEL || baked.channel || "nightly",
  owner: process.env.OWNER || baked.owner || "admin",
  baseURL: process.env.BASE_URL || baked.baseURL || "http://localhost:9000",
  edgeURL: process.env.EDGE_URL || baked.edgeURL || "",
};