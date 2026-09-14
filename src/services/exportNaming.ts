/** Portable archive names: never allow user input to create paths. */
export const sanitizeArchiveName = (name: string): string => {
  // Control characters are deliberately stripped from cross-platform filenames.
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').trim();
  const safe = cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : 'untitled';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? `_${safe}` : safe;
};

export const uniqueArchiveName = (name: string, used: Set<string>): string => {
  const base = sanitizeArchiveName(name);
  let candidate = base;
  let count = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base}_${count++}`;
  used.add(candidate.toLowerCase());
  return candidate;
};

/** Reserve image + caption together, including different images with the same stem. */
export const archiveImageNames = (name: string, format: 'txt' | 'json', used: Set<string>): { image: string; caption: string } => {
  const safe = sanitizeArchiveName(name);
  const dot = safe.lastIndexOf('.');
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : '';
  let suffix = '';
  let count = 2;
  while (used.has(`${stem}${suffix}${ext}`.toLowerCase()) ||
    used.has(`${stem}${suffix}.${format}`.toLowerCase()) || ext.toLowerCase() === `.${format}`) {
    // An imported file with a caption extension still needs a distinct image entry.
    if (ext.toLowerCase() === `.${format}`) return archiveImageNames(`${safe}.image`, format, used);
    suffix = `_${count++}`;
  }
  const image = `${stem}${suffix}${ext}`;
  const caption = `${stem}${suffix}.${format}`;
  used.add(image.toLowerCase());
  used.add(caption.toLowerCase());
  return { image, caption };
};
