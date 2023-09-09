module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["plugin:unicorn/recommended", "xo", "prettier"],
  ignorePatterns: ["dist", "coverage"],
  rules: {},
  overrides: [
    {
      files: ["*.ts", "*.cts", "*.mts", "*.d.ts"],
      extends: [
        "plugin:unicorn/recommended",
        "xo",
        "xo-typescript",
        "prettier",
      ],
      plugins: ["@typescript-eslint"],
      rules: {},
    },
  ],
};
