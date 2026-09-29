import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow French apostrophes (’) in JSX text without HTML-entity noise.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      // Our async hooks set loading/loaded flags inside effects on purpose.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
