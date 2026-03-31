import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/',
      '**/.next/',
      '**/node_modules/',
      '*.config.js',
      '*.config.cjs',
      'packages/site/src/data/',
    ],
  },

  // Base config for all TS files
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'warn',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-len': [
        'warn',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },

  // React config for core and site packages
  {
    files: ['packages/core/src/**/*.{ts,tsx}', 'packages/site/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Scanner package — Node.js, allow console
  {
    files: ['packages/scanner/src/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  }
);
