import { describe, expect, it } from 'vitest';
import { parseUseCaseFile } from '../content/parse';

const header = '== demo-case | Demo Case | tabular | batch | foundational | a=1 k=1';

describe('.uc parser', () => {
  it('reports file:line for malformed rows', () => {
    expect(() => parseUseCaseFile('x.uc', `${header}\nsn: only | two`)).toThrow(
      /x\.uc:2: "sn" needs 4 columns/,
    );
    expect(() => parseUseCaseFile('x.uc', `${header}\nbogus: field`)).toThrow(/unknown field "bogus"/);
    expect(() => parseUseCaseFile('x.uc', '== a | b | c')).toThrow(/header needs 6 fields/);
  });

  it('fails when a required section is absent', () => {
    expect(() => parseUseCaseFile('x.uc', `${header}\nobj: only an objective`)).toThrow(
      /missing required field "base"/,
    );
  });

  it('parses pipe stages and options', () => {
    const [u] = parseUseCaseFile(
      'x.uc',
      `${header}\nobj: o\nbase: b\nprod: p\npipe: Alpha stage @ tech a ; Beta stage @ tech b`,
    );
    expect(u!.pipe).toEqual([
      { label: 'Alpha stage', tech: 'tech a' },
      { label: 'Beta stage', tech: 'tech b' },
    ]);
    expect(u!.opts).toEqual({ a: 1, k: 1 });
  });
});
