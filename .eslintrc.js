module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true,
    },
    extends: ['airbnb-base', 'prettier'],
    plugins: ['prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'prettier/prettier': 'error',
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-underscore-dangle': ['error', { allow: ['_id', '__v'] }],
        'func-names': 'off',
        'consistent-return': 'off',
        'no-param-reassign': ['error', { props: false }],
        'class-methods-use-this': 'off',
        'import/prefer-default-export': 'off',
        'no-use-before-define': ['error', { functions: false }],
    },
};
