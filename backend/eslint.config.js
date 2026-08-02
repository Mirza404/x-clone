const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/utils/object-id.ts', 'src/**/*.test.ts'],
    rules: {
      // See .claude/rules/backend-conventions.md: compare ObjectId-like
      // values with equalsObjectId/hasObjectId from utils/object-id, not raw .toString().
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^[!=]==$/] CallExpression[callee.property.name='toString']",
          message:
            "Don't compare ObjectId-like values with raw .toString() ===/!==. Use equalsObjectId/hasObjectId from ../utils/object-id instead.",
        },
      ],
    },
  },
  prettierConfig
);
