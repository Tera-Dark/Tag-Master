import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const walk = async (dir) =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((entry) =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
      )
    )
  ).flat();
const files = (await walk('src/components')).filter(
  (file) => file.endsWith('.tsx') && !file.includes('__tests__')
);
const problems = [];
for (const file of [...files, 'src/App.tsx']) {
  const source = await readFile(file, 'utf8');
  if (/\b(?:bg|text|border|ring)-(?:blue|indigo|violet|purple|cyan|sky|fuchsia)-\d/.test(source))
    problems.push(`${file}: decorative colors must use the neutral design system`);
  if (/\bbg-gradient-to-/.test(source))
    problems.push(`${file}: decorative gradients are not part of this design system`);
  if (/\b(?:window\.)?(?:confirm|prompt|alert)\(/.test(source) && !source.includes('useDialogs'))
    problems.push(`${file}: use the shared in-app dialogs, not native browser prompts`);
  if (
    /(?:Modal|Lightbox|CropEditor)\.tsx$/.test(file) &&
    source.includes('return (') &&
    !source.includes('DialogOverlay')
  )
    problems.push(`${file}: use DialogOverlay for consistent dialog styling and focus management`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `UI style guard passed: ${files.length + 1} interface source files. Status colors and user-selected avatar colors are allowed.`
  );
