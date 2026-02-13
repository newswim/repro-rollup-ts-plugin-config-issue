#!/usr/bin/env node
/**
 * Test script to demonstrate type resolution differences between module settings.
 *
 * This script shows how TypeScript resolves types differently depending on
 * whether module is set to ESNext vs NodeNext.
 */

const ts = require('typescript')
const path = require('path')

const sourceFile = path.resolve(__dirname, 'src/index.ts')

console.log('='.repeat(60))
console.log('Type Resolution Comparison: ESNext vs NodeNext')
console.log('='.repeat(60))
console.log('')

// Test 1: ESNext/Bundler (the buggy scenario)
console.log('Test 1: ESNext + Bundler (simulates the bug)')
console.log('-'.repeat(60))

const programESNext = ts.createProgram({
  rootNames: [sourceFile],
  options: {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
  },
})

const diagESNext = ts.getPreEmitDiagnostics(programESNext)
console.log(`Diagnostics: ${diagESNext.length} errors`)

// Check what js-yaml resolves to
const hostESNext = ts.createCompilerHost({
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
})
const jsYamlESNext = ts.resolveModuleName(
  'js-yaml',
  sourceFile,
  { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
  hostESNext,
)
console.log(
  `js-yaml types: ${path.basename(jsYamlESNext.resolvedModule?.resolvedFileName || 'NOT FOUND')}`,
)

// Check for Error.cause related errors
const causeErrors = diagESNext.filter((d) =>
  ts.flattenDiagnosticMessageText(d.messageText, '').includes('argument'),
)
if (causeErrors.length > 0) {
  console.log(
    `Error.cause issue: YES - "${ts.flattenDiagnosticMessageText(causeErrors[0].messageText, '')}"`,
  )
} else {
  console.log('Error.cause issue: No')
}

// Check libs loaded
const libFilesESNext = programESNext
  .getSourceFiles()
  .filter((f) => f.fileName.includes('lib.'))
  .map((f) => path.basename(f.fileName))
console.log(`Libs loaded: ${libFilesESNext.length} files`)
console.log(
  `Has ES2022 Error lib: ${libFilesESNext.some((f) => f.includes('es2022.error')) ? 'YES ✅' : 'NO ❌'}`,
)

console.log('')

// Test 2: NodeNext (correct configuration)
console.log('Test 2: NodeNext + NodeNext (correct configuration)')
console.log('-'.repeat(60))

const programNodeNext = ts.createProgram({
  rootNames: [sourceFile],
  options: {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
  },
})

const diagNodeNext = ts.getPreEmitDiagnostics(programNodeNext)
console.log(`Diagnostics: ${diagNodeNext.length} errors`)

// Check what js-yaml resolves to
const hostNodeNext = ts.createCompilerHost({
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
})
const jsYamlNodeNext = ts.resolveModuleName(
  'js-yaml',
  sourceFile,
  { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  hostNodeNext,
)
console.log(
  `js-yaml types: ${path.basename(jsYamlNodeNext.resolvedModule?.resolvedFileName || 'NOT FOUND')}`,
)

// Check for Error.cause related errors
const causeErrorsNodeNext = diagNodeNext.filter((d) =>
  ts.flattenDiagnosticMessageText(d.messageText, '').includes('argument'),
)
if (causeErrorsNodeNext.length > 0) {
  console.log(
    `Error.cause issue: YES - "${ts.flattenDiagnosticMessageText(causeErrorsNodeNext[0].messageText, '')}"`,
  )
} else {
  console.log('Error.cause issue: No')
}

// Check libs loaded
const libFilesNodeNext = programNodeNext
  .getSourceFiles()
  .filter((f) => f.fileName.includes('lib.'))
  .map((f) => path.basename(f.fileName))
console.log(`Libs loaded: ${libFilesNodeNext.length} files`)
console.log(
  `Has ES2022 Error lib: ${libFilesNodeNext.some((f) => f.includes('es2022.error')) ? 'YES ✅' : 'NO ❌'}`,
)

console.log('')
console.log('='.repeat(60))
console.log('Summary')
console.log('='.repeat(60))
console.log('')

const esNextHasES2022 = libFilesESNext.some((f) => f.includes('es2022.error'))
const nodeNextHasES2022 = libFilesNodeNext.some((f) => f.includes('es2022.error'))

console.log('| Setting          | js-yaml types     | ES2022 Error lib | Diagnostics |')
console.log('|------------------|-------------------|------------------|-------------|')
console.log(
  `| ESNext/Bundler   | ${path.basename(jsYamlESNext.resolvedModule?.resolvedFileName || 'N/A').padEnd(17)} | ${esNextHasES2022 ? 'YES ✅'.padEnd(16) : 'NO ❌'.padEnd(16)} | ${String(diagESNext.length).padEnd(11)} |`,
)
console.log(
  `| NodeNext         | ${path.basename(jsYamlNodeNext.resolvedModule?.resolvedFileName || 'N/A').padEnd(17)} | ${nodeNextHasES2022 ? 'YES ✅'.padEnd(16) : 'NO ❌'.padEnd(16)} | ${String(diagNodeNext.length).padEnd(11)} |`,
)
console.log('')

if (!esNextHasES2022 && nodeNextHasES2022) {
  console.log('⚠️  ESNext/Bundler is missing ES2022 Error lib!')
  console.log('   This means Error.cause will not type-check correctly.')
}

const esNextTypes = path.basename(jsYamlESNext.resolvedModule?.resolvedFileName || '')
const nodeNextTypes = path.basename(jsYamlNodeNext.resolvedModule?.resolvedFileName || '')
if (esNextTypes !== nodeNextTypes) {
  console.log('')
  console.log('⚠️  js-yaml resolves to DIFFERENT type files!')
  console.log(`   ESNext:   ${esNextTypes}`)
  console.log(`   NodeNext: ${nodeNextTypes}`)
  console.log('   This could cause type mismatches.')
}
