import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SystemProcessor } from './system.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.get('REDIS_URL', 'redis://localhost:56379'));

        return {
          connection: {
            host: redisUrl.hostname,
            password: redisUrl.password || undefined,
            port: Number(redisUrl.port || 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'system' }),
  ],
  providers: [SystemProcessor],
})
export class WorkerModule {}
