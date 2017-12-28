import { promisify } from 'util';
import * as fs from 'fs';

const [readDirAsync, stAsync, existsAsync, mkdirAsync] = [
  fs.readdir,
  fs.stat,
  fs.exists,
  fs.mkdir,
].map(f => promisify(f));

/**
 * @param {string} srcPath
 * @returns
 */
const getFiles = async (srcPath: string) => {
  let files = new Array<string>();
  const results = await readDirAsync(srcPath);
  for (let file of results) {
    const path = `${srcPath}/${file}`;
    const stat = await stAsync(path);
    if (stat && stat.isFile()) {
      files.push(path);
    } else {
      let nested = await getFiles(path);
      files = [...files, ...nested];
    }
  }
  return files;
};

export { readDirAsync, stAsync, existsAsync, mkdirAsync, getFiles };
