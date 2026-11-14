import { describe, expect, it } from 'vitest';
import { checkInfra } from '../content/infra-checks';

describe('infrastructure files', () => {
  it('pass the static checks', () => {
    expect(checkInfra()).toEqual([]);
  });
});
