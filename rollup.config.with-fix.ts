/**
 * Rollup config WITH the fix.
 * Explicitly passing module/moduleResolution to the TypeScript plugin
 * prevents the TS5110 warning.
 */
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/index.ts',
  output: { file: 'dist/index.mjs', format: 'esm' },
  plugins: [
    typescript({
      compilerOptions: {
        // THE FIX: Explicitly set module and moduleResolution
        module: 'nodenext',
        moduleResolution: 'nodenext',
      },
    }),
  ],
  external: ['js-yaml'],
})
