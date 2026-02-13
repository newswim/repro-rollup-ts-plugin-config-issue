/**
 * Runtime test to demonstrate potential issues from module mismatch.
 *
 * This tests:
 * 1. Error.cause - ES2022 feature that requires correct lib loading
 * 2. js-yaml conditional exports resolution
 */

import process from 'node:process'

import yaml from 'js-yaml'

// Test 1: Error.cause (ES2022)
function testErrorCause() {
  console.log('Test 1: Error.cause (ES2022 feature)')

  try {
    try {
      throw new Error('Original error')
    } catch (originalError) {
      // This uses ES2022 Error.cause
      throw new Error('Wrapped error', { cause: originalError })
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log('  Error message:', error.message)
      console.log('  Error.cause:', error.cause)

      if (error.cause instanceof Error) {
        console.log('  ✅ Error.cause works correctly!')
        return true
      } else {
        console.log('  ❌ Error.cause is undefined or wrong type')
        return false
      }
    }
  }
  return false
}

// Test 2: js-yaml conditional exports
function testJsYaml() {
  console.log('\nTest 2: js-yaml conditional exports')

  const testObj = { name: 'test', value: 42 }
  const yamlStr = yaml.dump(testObj)
  const parsed = yaml.load(yamlStr)

  console.log('  Original:', testObj)
  console.log('  YAML:', yamlStr.trim())
  console.log('  Parsed:', parsed)

  if (JSON.stringify(testObj) === JSON.stringify(parsed)) {
    console.log('  ✅ js-yaml works correctly!')
    return true
  } else {
    console.log('  ❌ js-yaml produced different output')
    return false
  }
}

// Run tests
console.log('='.repeat(50))
console.log('Runtime Tests')
console.log('='.repeat(50))
console.log('')

const test1Pass = testErrorCause()
const test2Pass = testJsYaml()

console.log('')
console.log('='.repeat(50))
console.log('Results:', test1Pass && test2Pass ? '✅ All tests passed!' : '❌ Some tests failed')
console.log('='.repeat(50))

process.exit(test1Pass && test2Pass ? 0 : 1)
