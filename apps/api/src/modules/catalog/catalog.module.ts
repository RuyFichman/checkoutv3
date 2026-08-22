import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogService } from './catalog.service';
import { ProductsController } from './products.controller';
import { PublicCheckoutController } from './public-checkout.controller';
import { ThemesController } from './themes.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, ThemesController, PublicCheckoutController],
  providers: [CatalogService],
})
export class CatalogModule {}
