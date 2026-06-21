// Metro config for an Expo app inside a pnpm monorepo.
// Follows the official Expo monorepo guide: watch the workspace root and let
// Metro resolve modules from both the app's and the root's node_modules.
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo so changes in packages/* reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve node_modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
