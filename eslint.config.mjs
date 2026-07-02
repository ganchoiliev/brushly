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
    // The native AR app is its own project with its own tsconfig/lint.
    "brushly-ar/**",
    // Claude Code session worktrees — generated copies, never lint.
    ".claude/**",
    // Static design prototype kept for reference, not app code.
    "brushly-prototype.jsx",
  ]),
]);

export default eslintConfig;
