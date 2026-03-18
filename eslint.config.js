module.exports = [
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
