require('dotenv').config();
const packageJson = require('../../package.json');

module.exports = {
  app_name: process.env.APP_NAME || packageJson.name,
  version: process.env.VERSION || packageJson.version,
  channel: process.env.CHANNEL || "nightly",
  owner: process.env.OWNER || "admin",
  baseURL: process.env.BASE_URL || "http://localhost:9000",
  edgeURL: process.env.EDGE_URL || "",
};