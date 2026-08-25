import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class CredentialVaultService {
  encrypt(value: string, context: string) {
    const key = this.encryptionKey();
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, initializationVector);
    cipher.setAAD(Buffer.from(context, 'utf8'));
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

    return [
      'v1',
      initializationVector.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string, context: string) {
    const [version, initializationVector, authTag, encrypted] = value.split('.');
    if (!version || version !== 'v1' || !initializationVector || !authTag || !encrypted) {
      throw new ServiceUnavailableException('A credencial armazenada não pôde ser aberta.');
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(initializationVector, 'base64url'),
      );
      decipher.setAAD(Buffer.from(context, 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('A credencial armazenada não pôde ser aberta.');
    }
  }

  private encryptionKey() {
    const encoded = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!encoded) {
      throw new ServiceUnavailableException(
        'Configure CREDENTIALS_ENCRYPTION_KEY antes de conectar um gateway.',
      );
    }

    const key = Buffer.from(encoded, 'base64');
    if (key.byteLength !== 32) {
      throw new ServiceUnavailableException(
        'CREDENTIALS_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes.',
      );
    }
    return key;
  }
}
