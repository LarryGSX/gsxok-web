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
      // New compiler diagnostics on existing components are tracked as non-security debt.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  { files: ['sanity/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  { ignores: ['.next/**', 'node_modules/**'] },
]

export default eslintConfig
