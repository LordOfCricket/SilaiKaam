module.exports = {
  preset: '@react-native/jest-preset',
  // pnpm nests packages under `.pnpm/<name>@<version>/node_modules/<name>`, which breaks
  // the default preset's transformIgnorePatterns (it only expects a flat node_modules).
  // This mirrors the default but also matches through an optional `.pnpm/*/node_modules/` hop.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?)/)',
  ],
};
