#!/usr/bin/env tsx
/**
 * Streaming Command Executor using child_process.spawn
 *
 * Benefits:
 * - Clean stdout/stderr separation
 * - No PTY echo/prompt issues
 * - Real-time streaming output
 * - Reliable exit codes
 *
 * Limitations:
 * - No interactive commands (vim, less, etc.)
 * - No shell features (aliases, functions)
 * - Each command runs in fresh shell
 */
import { spawn } from 'node:child_process';
import * as readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '💻 ',
});

console.log('🚀 Streaming Command Executor');
console.log('Uses child_process.spawn for clean output');
console.log('Type "exit" to quit\n');

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
}

async function executeCommand(command: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    console.log(`🔄 Executing: ${command}\n`);

    // Parse command and arguments
    // For shells, we use: /bin/sh -c "command"
    const shell = process.env.SHELL || '/bin/bash';
    const child = spawn(shell, ['-c', command], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    // Stream stdout in real-time
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;

      // Print streaming output with prefix
      process.stdout.write(text.split('\n').map(line =>
        line ? `📤 ${line}` : ''
      ).join('\n'));
    });

    // Stream stderr in real-time
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;

      // Print streaming errors with prefix
      process.stderr.write(text.split('\n').map(line =>
        line ? `⚠️  ${line}` : ''
      ).join('\n'));
    });

    // Handle process completion
    child.on('close', (code, signal) => {
      console.log(`\n✅ Process completed`);

      resolve({
        stdout,
        stderr,
        exitCode: code,
        signal,
      });
    });

    // Handle errors
    child.on('error', (error) => {
      console.error(`\n❌ Process error: ${error.message}`);

      resolve({
        stdout,
        stderr: stderr + `\nProcess error: ${error.message}`,
        exitCode: null,
        signal: null,
      });
    });
  });
}

// Command handler
rl.on('line', async (line) => {
  const command = line.trim();

  if (command === 'exit' || command === 'quit') {
    console.log('👋 Goodbye!');
    rl.close();
    process.exit(0);
    return;
  }

  if (!command) {
    rl.prompt();
    return;
  }

  try {
    const result = await executeCommand(command);

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Exit code: ${result.exitCode ?? 'N/A'}`);
    console.log(`   Signal: ${result.signal ?? 'N/A'}`);
    console.log(`   Stdout: ${result.stdout.length} chars, ${result.stdout.split('\n').length} lines`);
    console.log(`   Stderr: ${result.stderr.length} chars, ${result.stderr.split('\n').length} lines`);

    if (result.exitCode === 0) {
      console.log(`✅ Command succeeded\n`);
    } else {
      console.log(`❌ Command failed with exit code ${result.exitCode}\n`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
  }

  rl.prompt();
});

console.log('💡 Try:');
console.log('   echo "Hello World"');
console.log('   time sleep 1          (works in shell)');
console.log('   ls -la | head -3      (pipes work)');
console.log('   git status');
console.log('   git log --oneline -3');
console.log('');

rl.prompt();
