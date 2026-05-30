# `@rollup/plugin-typescript` TS5110 reproduction

Minimal repro for a bug in
[`@rollup/plugin-typescript`](https://github.com/rollup/plugins/tree/master/packages/typescript)
where the plugin's default `module: 'esnext'` clobbers `module` /
`moduleResolution` inherited via `extends` in `tsconfig.json`.

## Status

| Bug                            | Status  | Links                                                                                                                                                |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS5110 — defaults beat extends | PR open | [rollup/plugins#2004](https://github.com/rollup/plugins/pull/2004), prior reports [#1583](https://github.com/rollup/plugins/issues/1583), [#1726](https://github.com/rollup/plugins/issues/1726) |

## Symptom

```
[plugin typescript] TS5110: Option 'module' must be set to 'NodeNext'
                    when option 'moduleResolution' is set to 'NodeNext'.
```

## Cause

The plugin docs say:

> The plugin loads any compilerOptions from the tsconfig.json file by default.
> Passing options to the plugin directly overrides those options.
> ([source](https://github.com/rollup/plugins/tree/master/packages/typescript#options))

That's only half true. In `packages/typescript/src/options/tsconfig.ts`, the
plugin merges configs roughly like this:

```ts
ts.parseJsonConfigFileContent(
  {
    ...tsConfigFile,
    compilerOptions: {
      ...DEFAULT_COMPILER_OPTIONS, // module: 'esnext'
      ...tsConfigFile.compilerOptions, // ← only LITERAL values from this file, NOT extends-inherited
    },
  },
  // ...
)
```

`tsConfigFile.compilerOptions` only contains values **literally written in the
leaf file**, not values inherited via `extends`. So when the leaf doesn't
re-state `module`, the plugin's `module: 'esnext'` default ends up in the
position TypeScript treats as "leaf-set", winning over the `nodenext` from the
extended base. `moduleResolution: 'nodenext'` survives because the plugin
doesn't default it — and TS flags the mismatch with TS5110.

## Reproduction

```
tsconfig.base.json            # module: "nodenext", moduleResolution: "nodenext"
tsconfig.json                 # extends tsconfig.base.json, sets nothing else
rollup.config.without-fix.ts  # triggers TS5110
rollup.config.with-fix.ts     # workaround: re-state module/moduleResolution inline
```

```bash
pnpm install
./test-rollup-bug.sh           # build comparison
node test-type-resolution.cjs  # type-checking diff
```

| Config                         | TS5110 | Build    |
| ------------------------------ | ------ | -------- |
| `rollup.config.without-fix.ts` | yes    | succeeds |
| `rollup.config.with-fix.ts`    | no     | succeeds |

## Workaround (as used in `rollup.config.with-fix.ts`)

Re-state `module` / `moduleResolution` on the plugin's `compilerOptions`. Plugin
options pass through a different code path that wins over the defaults:

```ts
typescript({
  compilerOptions: {
    module: 'nodenext',
    moduleResolution: 'nodenext',
  },
})
```

## Fix

[rollup/plugins#2004](https://github.com/rollup/plugins/pull/2004): apply plugin
defaults **after** `parseJsonConfigFileContent` returns, only for keys the
resolved config (extends chain included) left unset. Once merged and released,
the workaround block can be deleted.

## Additional impact: type resolution

The wrong `module` also drags in the wrong libs and type files, so the warning
is the easy-to-spot symptom of a deeper type-checking divergence.

`node test-type-resolution.cjs` compares the two configurations:

| Setting          | `@types/js-yaml` resolves to | `lib.es2022.error.d.ts` loaded | TS diagnostics |
| ---------------- | ---------------------------- | ------------------------------ | -------------- |
| ESNext / Bundler | `index.d.mts`                | no                             | 1              |
| NodeNext         | `index.d.ts`                 | yes                            | 0              |

Concrete consequence — under the buggy config, `Error.cause` fails type-check:

```ts
throw new Error('failed', { cause: originalError })
// Expected 0-1 arguments, but got 2.
```

The emitted JavaScript is identical either way, so runtime behavior on
Node 16.9+ is unaffected. Type-checking is what's broken.

## Environment

Node.js 24.x · TypeScript 5.x · rollup 4.x · `@rollup/plugin-typescript` 12.x
