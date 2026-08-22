import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client';

export { PrismaClient };
export * from './generated/prisma/enums';
export type * from './generated/prisma/models';

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create the Prisma client.');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}
