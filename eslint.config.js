import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import lit from 'eslint-plugin-lit';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['projects/**/*', 'dist/**/*', 'node_modules/**/*', '*.js', '!eslint.config.js'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
      lit,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...lit.configs['recommended'].rules,
      ...prettierConfig.rules,
      'import/no-named-default': 'off',
      'import/no-unresolved': 'off',
      'import/prefer-default-export': 'off',
      'class-methods-use-this': 'off',
      'lines-between-class-members': 'off',
      semi: ['error', 'always'],
      '@typescript-eslint/explicit-module-boundary-types': ['error'],
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-underscore-dangle': [
        'error',
        {
          allowAfterThis: true,
          allow: ['_config'],
        },
      ],
      'no-param-reassign': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'prefer-destructuring': 'off',
    },
  },
];
