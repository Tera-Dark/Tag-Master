// Checks the prospective commit without staging files or exposing detected credential values.
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean)
  ),
];
const problems = [];
for (const file of files) {
  let info;
  try {
    info = await stat(file);
  } catch {
    continue;
  } // Deleted tracked files are valid pending deletions.
  if (!info.isFile()) continue;
  if (
    /(^|\/)(node_modules|dist|artifacts|coverage|\.vite)\//.test(file) ||
    /\.(zip|log|tsbuildinfo)$/.test(file) ||
    (/(^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith('.env.example'))
  )
    problems.push(`${file}: generated or sensitive file in prospective commit`);
  if (info.size > 1024 * 1024)
    problems.push(`${file}: exceeds 1 MiB; review whether this belongs in source control`);
  if (!/\.(?:ts|tsx|js|mjs|cjs|json|md|yml|yaml|html|txt|env|example)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  if (
    /AIza[\w-]{35}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      text
    )
  )
    problems.push(`${file}: possible credential; value intentionally not printed`);
  if (/^(?:<{7}|={7}|>{7})(?:\s|$)/m.test(text))
    problems.push(`${file}: possible unresolved merge conflict`);
}
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Release hygiene passed: ${files.length} prospective files. No staging, commit or push performed. Pattern checks are not a full secret/history audit.`
  );
