import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      // Existing component diagnostics remain visible; Node staging scripts have no React plugin.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  { files: ['sanity/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  // Node --require preload must be CommonJS and is never bundled into the app.
  {
    files: ['staging/network-guard.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { ignores: ['.next/**', 'node_modules/**'] },
]

export default eslintConfig
