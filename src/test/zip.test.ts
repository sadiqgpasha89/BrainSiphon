import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { crc32, makeZip } from '../lib/zip';

describe('zip writer', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('is deterministic', () => {
    const a = makeZip([{ path: 'a.txt', data: 'hello' }]);
    const b = makeZip([{ path: 'a.txt', data: 'hello' }]);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('produces an archive that unzip accepts and extracts byte for byte', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zip-'));
    try {
      const file = join(dir, 'x.zip');
      writeFileSync(
        file,
        makeZip([
          { path: 'dir/a.txt', data: 'héllo wörld' },
          { path: 'b.csv', data: 'a,b\n1,2\n' },
        ]),
      );
      execFileSync('python3', [
        '-I',
        '-c',
        'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert z.read("dir/a.txt").decode()=="héllo wörld";assert z.read("b.csv")==b"a,b\\n1,2\\n"',
        file,
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
