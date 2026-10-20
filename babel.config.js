// __PERF__ is inlined at babel-transform time based on the PERF env var. The
// JS engine in production builds doesn't have a real process.env, so we replace
// every `__PERF__` identifier with the literal true/false here. This matches
// what Metro does for __DEV__ (via the `dev` flag of the transformer).
//
// Set PERF=1 npm run ios-release  (or any release script) to enable.

function inlinePerfFlag({ types: t }) {
  const perfEnabled = process.env.PERF === "1";
  return {
    name: "inline-perf-flag",
    visitor: {
      Identifier(path) {
        if (path.node.name !== "__PERF__") return;
        if (path.scope.hasBinding("__PERF__")) return;
        // skip key/property positions
        if (path.parentPath.isMemberExpression() && path.parent.property === path.node) return;
        if (path.parentPath.isObjectProperty() && path.parent.key === path.node && !path.parent.computed) return;
        path.replaceWith(t.booleanLiteral(perfEnabled));
      },
    },
  };
}

// beBEARlifts: webpack defines __OFFLINE_ONLY__ for the web build. Metro has no DefinePlugin, so native
// bundles get it here. The fork's native app is offline by default; LFT_OFFLINE_ONLY=0 builds upstream's online app.
function inlineOfflineOnlyFlag({ types: t }) {
  const isOfflineOnly = process.env.LFT_OFFLINE_ONLY !== "0";
  return {
    name: "inline-offline-only-flag",
    visitor: {
      Identifier(path) {
        if (path.node.name !== "__OFFLINE_ONLY__") return;
        if (path.scope.hasBinding("__OFFLINE_ONLY__")) return;
        if (path.parentPath.isMemberExpression() && path.parent.property === path.node) return;
        if (path.parentPath.isObjectProperty() && path.parent.key === path.node && !path.parent.computed) return;
        path.replaceWith(t.booleanLiteral(isOfflineOnly));
      },
    },
  };
}

module.exports = function (api) {
  // Make babel's cache depend on PERF so toggling it invalidates transformed files.
  api.cache.using(() => `${process.env.PERF || "0"}:${process.env.LFT_OFFLINE_ONLY || ""}`);
  const isMetro = api.caller((caller) => caller != null && caller.name === "metro");
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [inlinePerfFlag, ...(isMetro ? [inlineOfflineOnlyFlag] : []), "react-native-worklets/plugin"],
  };
};
