import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function derive(password: string, salt: string, cost = COST) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: cost, r: BLOCK_SIZE, p: PARALLELIZATION },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(key);
      },
    );
  });
}

@Injectable()
export class PasswordService {
  async hash(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const key = await derive(password, salt);

    return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt, key.toString('base64url')].join('$');
  }

  async verify(password: string, encoded: string) {
    const [algorithm, rawCost, rawBlockSize, rawParallelization, salt, expected] =
      encoded.split('$');

    if (
      algorithm !== 'scrypt' ||
      !rawCost ||
      !rawBlockSize ||
      !rawParallelization ||
      !salt ||
      !expected
    ) {
      return false;
    }

    const cost = Number(rawCost);
    const blockSize = Number(rawBlockSize);
    const parallelization = Number(rawParallelization);

    if (cost !== COST || blockSize !== BLOCK_SIZE || parallelization !== PARALLELIZATION) {
      return false;
    }

    const actual = await derive(password, salt, cost);
    const expectedBuffer = Buffer.from(expected, 'base64url');

    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  }
}
