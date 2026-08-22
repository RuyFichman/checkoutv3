import { describe, expect, it } from 'vitest';

import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with a unique salt and verifies the original value', async () => {
    const first = await service.hash('checkout123');
    const second = await service.hash('checkout123');

    expect(first).not.toBe(second);
    await expect(service.verify('checkout123', first)).resolves.toBe(true);
    await expect(service.verify('senha-incorreta1', first)).resolves.toBe(false);
  });

  it('rejects malformed hashes', async () => {
    await expect(service.verify('checkout123', 'invalid')).resolves.toBe(false);
  });
});
