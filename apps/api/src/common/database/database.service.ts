import { createPrismaClient, type PrismaClient } from '@checkout/db';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient = createPrismaClient();

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
