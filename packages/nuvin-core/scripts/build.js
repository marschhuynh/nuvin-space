#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, cpSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const distDir = join(__dirname, '../dist');
const libDir = join(__dirname, '../lib');

console.log('🚀 Building nuvin-core...');

try {
  execSync('npx tsc --noEmit', { cwd: join(__dirname, '..'), stdio: 'inherit' });
  console.log('✓ TypeScript type check passed');
} catch (error) {
  console.error('✗ TypeScript type check failed');
  process.exit(1);
}

try {
  execSync('npx tsup', { cwd: join(__dirname, '..'), stdio: 'inherit' });
  console.log('✓ TypeScript compilation completed');
} catch (error) {
  console.error('✗ TypeScript compilation failed');
  process.exit(1);
}

try {
  execSync('node scripts/generate-version.js', { cwd: join(__dirname, '..'), stdio: 'inherit' });
  console.log('✓ Version generation completed');
} catch (error) {
  console.error('✗ Version generation failed');
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error('✗ Dist directory not found');
  process.exit(1);
}

// Temporarily disable obfuscation for debugging
console.log('⚠ Obfuscation disabled for debugging');

console.log('🎉 Build complete!');