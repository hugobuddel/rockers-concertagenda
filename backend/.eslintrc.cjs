module.exports = {

  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'airbnb-base'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-mixed-operators': 'off',
    strict: 0,
    'no-useless-escape': 'off',
    'no-multi-spaces': [
      1,
      {
        exceptions: {
          VariableDeclarator: true,
          FunctionExpression: true,
        },
      },
    ],
    'key-spacing': [0, { align: 'value' }],
    'no-underscore-dangle': 0,
    'react/jsx-no-target-blank': 0,
    'react/prop-types': 0,
  },
};
