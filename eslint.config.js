/* @ts-check */
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import importPlugin from 'eslint-plugin-import';

export default [
  // Ignore common output and external dirs (and config files)
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'eslint.config.js',
      '*.config.*',
      'types/**',
      '**/*.d.ts',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Global adjustments
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Project rules for TS/JS (apply only to source files)
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier,
      'unused-imports': unusedImports,
      import: importPlugin,
    },
    rules: {
      // Formatting
      'prettier/prettier': 'warn',

      // Replace default unused-vars with unused-imports for better autofix
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Report unused exports across modules (manual removal)
      'import/no-unused-modules': ['error', { unusedExports: true, missingExports: false }],

      // Other existing rules
      'no-empty': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
    },
  },

  // Test files: provide Vitest globals
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__/**/*.ts'],
  },
];
