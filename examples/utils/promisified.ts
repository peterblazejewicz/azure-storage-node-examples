import { promisify } from 'util';
import * as fs from 'fs';

const [readDirAsync, stAsync, existsAsync, mkdirAsync] = [
  fs.readdir,
  fs.stat,
  fs.exists,
  fs.mkdir,
].map(f => promisify(f));

export { readDirAsync, stAsync, existsAsync, mkdirAsync };
