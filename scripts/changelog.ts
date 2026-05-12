#!/usr/bin/env node --experimental-strip-types

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'UPCOMING_CHANGELOG.md');

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    from: { type: 'string', short: 'f' },
    to: { type: 'string', short: 't' },
    model: {
      type: 'string',
      short: 'm',
      default: process.env.OPENCODE_RELEASE_NOTES_MODEL ?? 'opencode-go/kimi-k2.6',
    },
    variant: { type: 'string', default: 'low' },
    print: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: node --experimental-strip-types scripts/changelog.ts [options]

Generates UPCOMING_CHANGELOG.md by running the opencode changelog command.

Options:
  -f, --from <ref>    Starting ref (default: latest tag, if any)
  -t, --to <ref>      Ending ref (default: HEAD)
  -m, --model <model> OpenCode model (default: opencode-go/kimi-k2.6)
      --variant <name> Thinking variant for opencode run (default: low)
      --print          Print UPCOMING_CHANGELOG.md after success
  -h, --help          Show this help message
`);
  process.exit(0);
}

const args = [...positionals];
if (values.from) args.push('--from', values.from);
if (values.to) args.push('--to', values.to);

rmSync(file, { force: true });

const result = spawnSync(
  'opencode',
  ['run', '--model', values.model!, '--variant', values.variant ?? 'low', '--command', 'changelog', '--', ...args],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

if (result.status !== 0) process.exit(result.status ?? 1);

if (!existsSync(file)) {
  console.error(`Expected ${file} to be created by the opencode changelog command.`);
  process.exit(1);
}

if (values.print) process.stdout.write(readFileSync(file, 'utf8'));
