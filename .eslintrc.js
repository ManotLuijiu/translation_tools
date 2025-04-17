module.exports = {
  extends: [
    'eslint:recommended', // basic ESLint rules
    'plugin:react/recommended', // react rules if you're using React
    'prettier', // Disable ESLint rules that conflict with Prettier
    'plugin:prettier/recommended', // Enable Prettier as ESLint rules
  ],
  plugins: ['prettier'], // Enable Prettier plugin for ESLint
  rules: {
    // Your custom ESLint rules here, but don't include rules that conflict with Prettier formatting
    'prettier/prettier': ['error', { singleQuote: true, semi: true }],
  },
};
