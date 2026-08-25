import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CredentialVaultService } from './credential-vault.service';

describe('CredentialVaultService', () => {
  const previousKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  const vault = new CredentialVaultService();

  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    else process.env.CREDENTIALS_ENCRYPTION_KEY = previousKey;
  });

  it('encrypts credentials with authenticated workspace context', () => {
    const plaintext = JSON.stringify({ accessToken: 'secret-token' });
    const encrypted = vault.encrypt(plaintext, 'workspace_a:MERCADO_PAGO');

    expect(encrypted).not.toContain('secret-token');
    expect(vault.decrypt(encrypted, 'workspace_a:MERCADO_PAGO')).toBe(plaintext);
    expect(() => vault.decrypt(encrypted, 'workspace_b:MERCADO_PAGO')).toThrow();
  });
});
