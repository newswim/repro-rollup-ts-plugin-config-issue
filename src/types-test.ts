/**
 * Test to demonstrate type resolution differences between module settings.
 *
 * When TypeScript uses the wrong module resolution:
 * 1. @types/js-yaml has different entry points for ESM vs CJS
 * 2. The types may come from different .d.ts files
 * 3. This could lead to type mismatches
 */

import type { DumpOptions, LoadOptions } from 'js-yaml'
// Test that the types match what js-yaml actually expects at runtime
import yaml from 'js-yaml'

// These types should be available from @types/js-yaml
// If module resolution is wrong, they might not be found or have different shapes

const loadOpts: LoadOptions = {
  filename: 'test.yaml',
  onWarning: (warning) => console.warn(warning),
}

const dumpOpts: DumpOptions = {
  indent: 2,
  lineWidth: 80,
  noRefs: true,
}

console.log('LoadOptions:', loadOpts)
console.log('DumpOptions:', dumpOpts)

const testYaml = 'name: test\nvalue: 42'
const parsed = yaml.load(testYaml, loadOpts)
console.log('Parsed with options:', parsed)

const dumped = yaml.dump({ name: 'test', value: 42 }, dumpOpts)
console.log('Dumped with options:', dumped)
