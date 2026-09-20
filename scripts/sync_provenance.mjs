/**
 * Regenerate the README's build-provenance trail from `git log`.
 *
 * This block drifted twice — the adversarial audit raised it as finding #3, and it went stale
 * again during the polish pass. A hand-maintained copy of the git log will always lag the git
 * log, so it is generated instead. Run it before submitting:
 *
 *   node scripts/sync_provenance.mjs
 *
 * It rewrites only the fenced block between the provenance heading and the footnote below it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const README = new URL('../README.md', import.meta.url);
const START = 'All commits are inside the 09:00–17:00 window and all are authored by the entrant.';
const END = '*(One slip preserved rather than rewritten:';
const MAX_SUBJECT = 86;

const log = execFileSync(
  'git',
  ['log', '--reverse', '--format=%h|%cd|%s', '--date=format:%H:%M'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');

const lines = log.map((entry) => {
  const [hash, time, ...rest] = entry.split('|');
  let subject = rest.join('|');
  if (subject.length > MAX_SUBJECT) subject = `${subject.slice(0, MAX_SUBJECT - 3).trimEnd()}...`;
  return `${hash} ${time}  ${subject}`;
});

const block =
  `${START} The trail\n` +
  'below is generated from `git log` by `node scripts/sync_provenance.mjs`, run before each push:\n\n' +
  '```\n' +
  lines.join('\n') +
  '\n```\n\n';

const readme = readFileSync(README, 'utf8');
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start === -1 || end === -1) {
  console.error('sync_provenance: could not find the provenance block markers in README.md');
  process.exit(1);
}

const next = readme.slice(0, start) + block + readme.slice(end);
if (next === readme) {
  console.log(`provenance: already in sync (${lines.length} commits)`);
} else {
  writeFileSync(README, next);
  console.log(`provenance: README updated from git log (${lines.length} commits)`);
}
