import { describe, expect, it } from 'vitest';
import {
  decodeBalance,
  decodeCredential,
} from '../../src/components/account/accountHostAdapter';

describe('account host response decoders', () => {
  it('maps staging credential and balance responses', () => {
    expect(
      decodeCredential({
        token: 'token',
        expires_at: '2030-01-01T00:00:00Z',
        workspace: { id: 'w' },
      })
    ).toEqual({ token: 'token', expiresAt: 1893456000000, workspaceId: 'w' });
    expect(decodeBalance({ effective_balance_micros: 42 })).toEqual({ balance: 42 });
  });
});
