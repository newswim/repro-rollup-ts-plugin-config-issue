/**
 * Rollup config WITHOUT the fix.
 * The plugin's DEFAULT_COMPILER_OPTIONS overrides module from tsconfig.
 * This triggers the TS5110 warning.
 */
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/index.ts',
  output: { file: 'dist/index.mjs', format: 'esm' },
  plugins: [
    typescript({
      // No compilerOptions for module/moduleResolution
      // Plugin's DEFAULT_COMPILER_OPTIONS will set module: 'esnext'
      // But tsconfig has moduleResolution: 'nodenext' via extends
      // This mismatch triggers TS5110
    }),
  ],
  external: ['js-yaml'],
})
