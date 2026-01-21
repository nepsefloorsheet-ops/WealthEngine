import js from "@eslint/js";
import html from "eslint-plugin-html";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    plugins: {
      html
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        domUtils: "readonly",
        apiClient: "readonly",
        sharedFormatter: "readonly",
        ApexCharts: "readonly",
        LightweightCharts: "readonly",
        currentSymbol: "writable",
        watchlistUtils: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-redeclare": "error",
      "no-inner-declarations": "off",
      "no-prototype-builtins": "off"
    }
  }
];
