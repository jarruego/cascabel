import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', '.venv', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Código de la app: navegador.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // src/datos/cargar.ts es el ÚNICO sitio que habla con la red. Ver CLAUDE.md.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa src/datos/cargar.ts: centraliza el origen y evita terceros.' },
      ],
    },
  },
  { files: ['src/datos/cargar.ts'], rules: { 'no-restricted-globals': 'off' } },

  // Worklets: corren en el hilo de audio, con sus propios globales.
  {
    files: ['public/worklets/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.worker,
        AudioWorkletProcessor: 'readonly',
        registerProcessor: 'readonly',
        sampleRate: 'readonly',
        currentTime: 'readonly',
        currentFrame: 'readonly',
      },
    },
  },

  // Herramientas de línea de comandos: Node.
  {
    files: ['tools/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },

  { files: ['tests/**/*.ts'], languageOptions: { globals: { ...globals.node } } },
);
