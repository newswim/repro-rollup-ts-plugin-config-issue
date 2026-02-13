# @rollup/plugin-typescript Bug Reproduction

This package demonstrates a bug in [@rollup/plugin-typescript](https://github.com/rollup/plugins/tree/master/packages/typescript) where the plugin's `DEFAULT_COMPILER_OPTIONS` incorrectly overrides `module` settings inherited via `extends` in `tsconfig.json`.

## The Bug

The plugin docs say:

> The plugin loads any compilerOptions from the tsconfig.json file by default. Passing options to the plugin directly overrides those options. ([source](https://github.com/rollup/plugins/tree/master/packages/typescript#options)).

This isn't always the case. When your `tsconfig.json` inherits `module` and `moduleResolution` from a "base" config via `extends`, the plugin emits a spurious warning:

```
[plugin typescript] TS5110: Option 'module' must be set to 'NodeNext' when
                    option 'moduleResolution' is set to 'NodeNext'.
```

### Root Cause

In `src/options/tsconfig.ts`, the plugin merges configs like this:

```ts
ts.parseJsonConfigFileContent({
  ...tsConfigFile,
  compilerOptions: {
    ...DEFAULT_COMPILER_OPTIONS,     // module: 'esnext'
    ...tsConfigFile.compilerOptions, // Only LITERAL values, not inherited!
  }
}, ...);
```

The problem: `tsConfigFile.compilerOptions` only contains values **literally defined in that file**, NOT values inherited via `extends`. So:

1. `DEFAULT_COMPILER_OPTIONS` sets `module: 'esnext'`
2. Your tsconfig extends a base with `module: 'nodenext'`, but this isn't in the literal object
3. `module: 'esnext'` wins
4. TypeScript resolves `moduleResolution: 'nodenext'` from the extended config
5. Now we have `module: 'esnext'` + `moduleResolution: 'nodenext'` → **TS5110 error**

## Reproduction

### File Structure

```
tsconfig.base.json            # Has module: "nodenext", moduleResolution: "nodenext"
tsconfig.json                 # Extends tsconfig.base.json (no module setting)
rollup.config.without-fix.ts  # Triggers the bug
rollup.config.with-fix.ts     # Workaround: explicitly pass compilerOptions
```

### Run the Tests

```bash
# Install dependencies
pnpm install

# Run the automated build test
./test-rollup-bug.sh

# Run the type resolution comparison
node test-type-resolution.cjs
```

### Expected Results: Build Test

| Config                         | TS5110 Warning     | Build    |
| ------------------------------ | ------------------ | -------- |
| `rollup.config.without-fix.ts` | ✅ Warning appears | Succeeds |
| `rollup.config.with-fix.ts`    | ❌ No warning      | Succeeds |

### Expected Results: Type Resolution Test

| Setting        | js-yaml types | ES2022 Error lib | Diagnostics |
| -------------- | ------------- | ---------------- | ----------- |
| ESNext/Bundler | index.d.mts   | NO ❌            | 1           |
| NodeNext       | index.d.ts    | YES ✅           | 0           |

This demonstrates:

- **Different type files loaded** - `index.d.mts` vs `index.d.ts` for js-yaml
- **Missing ES2022 libs** - 34 fewer lib files loaded with ESNext/Bundler
- **Real type errors** - `Error.cause` fails to type-check with the buggy configuration

## Workaround

Explicitly pass `module` and `moduleResolution` to the TypeScript plugin:

```ts
import typescript from '@rollup/plugin-typescript'

export default {
  plugins: [
    typescript({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
      },
    }),
  ],
}
```

## Additional Impact: Incorrect TypeScript Lib Loading

Beyond the warning, this bug can cause **incorrect type checking** due to different TypeScript libs being loaded.

### Observed Behavior

| Module Setting | Libs Loaded                                     | Features Available |
| -------------- | ----------------------------------------------- | ------------------ |
| `NodeNext`     | `lib.esnext.full.d.ts`, `lib.es2022.error.d.ts` | `Error.cause` ✅   |
| `ESNext` (bug) | `lib.d.ts` (ES5 baseline)                       | `Error.cause` ❌   |

### Example

```ts
// This may fail type-checking with ESNext module (wrong libs loaded)
throw new Error('Failed', { cause: originalError })
// Error: Expected 0-1 arguments, but got 2

// But passes with NodeNext (correct libs loaded)
```

### Type Resolution Differences

Packages with conditional type exports (like `@types/js-yaml`) may resolve to different `.d.ts` files:

```jsonc
// @types/js-yaml/package.json
{
  "exports": {
    ".": {
      "types": {
        "import": "./index.d.mts", // ESM types
        "default": "./index.d.ts" // CJS types
      }
    }
  }
}
```

With wrong module resolution, TypeScript might load different type definitions than what matches the runtime entry point.

## Runtime Considerations

The bug primarily causes **type-checking issues**, not runtime issues. The emitted JavaScript is identical regardless of the warning.

However, on older Node.js versions:

| Feature             | Node.js Version Required |
| ------------------- | ------------------------ |
| `Error.cause`       | 16.9.0+                  |
| ESM imports         | 14+ (stable)             |
| Conditional exports | 14+ (full support)       |

If TypeScript resolves types from the wrong entry point (CJS vs ESM), and the package has API differences between exports, runtime errors could occur.

## Suggested Fix

The plugin should either:

1. **Remove `module` from `DEFAULT_COMPILER_OPTIONS`** - let it be determined by tsconfig entirely

2. **Move defaults to the 4th parameter** of `parseJsonConfigFileContent` (existingOptions), which has lower precedence:

   ```ts
   ts.parseJsonConfigFileContent(
     tsConfigFile, // Let extends resolve naturally
     ts.sys,
     basePath,
     {
       module: ts.ModuleKind.ESNext, // Low-priority default
       ...FORCED_COMPILER_OPTIONS,
     },
   )
   ```

3. **Pre-resolve the extends chain** before merging, so inherited values are available for the spread operation.

## Environment

- Node.js: v24.x
- TypeScript: 5.x
- Rollup: 4.x
- @rollup/plugin-typescript: 12.x
