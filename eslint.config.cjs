// Basic ESLint flat config compatible with ESLint v9 for TypeScript files.
// Uses @typescript-eslint parser and plugin (installed as devDependencies).
module.exports = [
  // Global ignores
  {
    ignores: ["node_modules/**", "out/**"],
  },

  // TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
        ecmaVersion: 2020,
      },
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    // Use rules from the recommended config of the TypeScript plugin,
    // but keep this minimal so it doesn't add a lot of strictness unexpectedly.
    rules: Object.assign(
      {},
      require("@typescript-eslint/eslint-plugin").configs.recommended.rules,
      {
        // allow the project to use console.* without failing
        "no-console": "off",
      }
    ),
  },

  // JavaScript files
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {},
  },
];
