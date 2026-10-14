import tseslint from "typescript-eslint";
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.open-next/**",
      "**/next-env.d.ts",
    ],
  },
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
);
