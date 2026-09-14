// Shared base ESLint (flat config) rules for SilaiKaam Node/TypeScript packages.
// Apps/services extend this and add their own framework-specific config on top.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier,
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'out/**', 'node_modules/**', 'coverage/**'],
  },
);

export default baseConfig;
