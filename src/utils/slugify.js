export function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
