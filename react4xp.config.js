// React4XP build config. Template with all options:
// node_modules/@enonic/react4xp/examples/react4xp.config.js
module.exports = {
  // Entries live in src/main/resources/react4xp/entries/. Everything else under react4xp/
  // is chunked into react4xp.<hash>.js.
  entryDirs: ['entries'],
  // Globals bundle = what SSR needs; react + react-dom by default.
  globals: {},
  externals: {},
};
