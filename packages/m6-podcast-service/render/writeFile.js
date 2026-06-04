import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Ensure a directory exists (creates parents as needed).
 * @param {string} dir
 */
export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Write content to filePath atomically (write to *.tmp then rename into place).
 * A reader mid-request never sees a half-written file. rename() is atomic on
 * the same filesystem.
 *
 * @param {string} filePath  absolute path to the destination file
 * @param {string} content   UTF-8 string to write
 */
export async function atomicWrite(filePath, content) {
  await ensureDir(path.dirname(filePath));
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}
