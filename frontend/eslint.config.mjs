import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import reactPlugin from 'eslint-plugin-react';

const eslintConfig = [
  { ignores: ['.next/**', 'coverage/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  testingLibrary.configs['flat/react'],
  jestDom.configs['flat/recommended'],
  {
    plugins: { react: reactPlugin },
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      // See .claude/rules/react-keys.md: disallowed by default, override with
      // an eslint-disable comment + reasoning only for lists that truly can't reorder.
      'react/no-array-index-key': 'error',
    },
  },
];

export default eslintConfig;
