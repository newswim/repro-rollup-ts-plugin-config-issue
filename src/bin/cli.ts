#!/usr/bin/env node
/**
 * Test CLI that uses the library
 */

import process from 'node:process'

import { parseConfig, stringifyConfig } from '../index.ts'

const testYaml = `
name: test
value: 42
`

try {
  /* eslint-disable no-console */
  const config = parseConfig(testYaml)
  console.log('Parsed config:', config)
  console.log('Stringified:', stringifyConfig(config))
} catch (error) {
  // ES2022 Error.cause access
  if (error instanceof Error && error.cause) {
    console.error('Error with cause:', error.message, error.cause)
  } else {
    console.error('Error:', error)
  }
  process.exit(1)
}
