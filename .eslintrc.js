module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  plugins: ['react', 'react-native'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-native/no-color-literals': 'off',
  },
  env: {
    'react-native/react-native': true,
  },
  settings: {
    react: { version: 'detect' },
  },
};
