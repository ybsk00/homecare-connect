import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.expo/**",
      "**/.turbo/**",
      "**/coverage/**",
      "supabase/functions/_shared/**",
    ],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Project-wide settings
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // No unused vars - warn, allow underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // No explicit any - warn (not error, to avoid blocking builds)
      "@typescript-eslint/no-explicit-any": "warn",

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // Allow empty functions (common in RN/Next.js patterns)
      "@typescript-eslint/no-empty-function": "off",

      // Allow require imports (needed for some RN/Expo configs)
      "@typescript-eslint/no-require-imports": "off",

      // Prefer const
      "prefer-const": "warn",

      // No console in production code (warn only)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
