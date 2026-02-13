#!/bin/bash
# Test script to validate the rollup TypeScript plugin bug
# Run from packages/tmp_rovodev_rollup_test/

set -e

echo "=========================================="
echo "Test 1: Build WITHOUT compilerOptions fix"
echo "=========================================="
echo ""

rm -rf dist
cp rollup.config.without-fix.ts rollup.config.ts 2>/dev/null || true

echo "Building with: rollup.config.without-fix.ts"
echo ""

# Capture both stdout and stderr
pnpm rollup -c rollup.config.without-fix.ts 2>&1 | tee /tmp/rollup-without-fix.log

echo ""
echo "--- Checking for TS5110 warning ---"
if grep -q "TS5110" /tmp/rollup-without-fix.log; then
  echo "✅ TS5110 warning FOUND (expected - bug is present)"
else
  echo "❌ TS5110 warning NOT found (unexpected)"
fi

echo ""
echo "--- Checking for argument errors ---"
if grep -q "arguments" /tmp/rollup-without-fix.log; then
  echo "⚠️  Argument-related errors found:"
  grep "arguments" /tmp/rollup-without-fix.log
else
  echo "No argument errors found"
fi

# Save the output
mv dist dist-without-fix 2>/dev/null || true

echo ""
echo ""
echo "=========================================="
echo "Test 2: Build WITH compilerOptions fix"
echo "=========================================="
echo ""

rm -rf dist

echo "Building with: rollup.config.with-fix.ts"
echo ""

pnpm rollup -c rollup.config.with-fix.ts 2>&1 | tee /tmp/rollup-with-fix.log

echo ""
echo "--- Checking for TS5110 warning ---"
if grep -q "TS5110" /tmp/rollup-with-fix.log; then
  echo "❌ TS5110 warning FOUND (unexpected - fix should prevent this)"
else
  echo "✅ TS5110 warning NOT found (expected - fix is working)"
fi

echo ""
echo "--- Checking for argument errors ---"
if grep -q "arguments" /tmp/rollup-with-fix.log; then
  echo "⚠️  Argument-related errors found:"
  grep "arguments" /tmp/rollup-with-fix.log
else
  echo "✅ No argument errors found"
fi

# Save the output
mv dist dist-with-fix 2>/dev/null || true

echo ""
echo ""
echo "=========================================="
echo "Test 3: Compare outputs"
echo "=========================================="
echo ""

if [ -d "dist-without-fix" ] && [ -d "dist-with-fix" ]; then
  echo "Files in dist-without-fix:"
  find dist-without-fix -name "*.mjs" -o -name "*.d.mts" | sort
  
  echo ""
  echo "Files in dist-with-fix:"
  find dist-with-fix -name "*.mjs" -o -name "*.d.mts" | sort
  
  echo ""
  echo "--- Diff of index.mjs ---"
  diff dist-without-fix/index.mjs dist-with-fix/index.mjs && echo "No differences!" || true
else
  echo "Could not compare - one or both builds failed"
fi

echo ""
echo "=========================================="
echo "Test 4: Runtime validation"
echo "=========================================="
echo ""

# Build and run the runtime test with the "without-fix" config
echo "Building runtime-test.ts with WITHOUT fix config..."
rm -rf dist
pnpm rollup -c rollup.config.without-fix.ts --input src/runtime-test.ts --file dist/runtime-test.mjs 2>&1 | grep -v "^$"

if [ -f "dist/runtime-test.mjs" ]; then
  echo ""
  echo "Running runtime test (built WITHOUT fix):"
  node dist/runtime-test.mjs 2>&1 || true
else
  echo "❌ Failed to build runtime-test.mjs"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Check the output above to validate:"
echo "1. WITHOUT fix: Should show TS5110 warning"
echo "2. WITH fix: Should NOT show TS5110 warning"
echo "3. Both should produce identical output (the warning doesn't affect emit)"
echo "4. Runtime tests should pass (Error.cause and js-yaml work correctly)"
echo ""
echo "Note: The bug primarily causes type-checking issues, not runtime issues."
echo "However, on older Node.js versions:"
echo "  - Error.cause requires Node 16.9.0+ (undefined on older versions)"
echo "  - Conditional exports resolution may differ between Node versions"
echo "  - If TypeScript resolves types from wrong entry point (CJS vs ESM),"
echo "    API differences could cause runtime errors on some versions."
