module.exports = [
  {
    // Global ignores — scratch/ contains HTML snippets saved as .js,
    // vendor/ contains minified third-party bundles.
    ignores: [
      "scratch/**",
      "public/vendor/**",
      "node_modules/**",
      "tmp/**"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: { window: "readonly", document: "readonly", navigator: "readonly" }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
