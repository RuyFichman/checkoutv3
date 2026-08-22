import { productInputSchema } from '@checkout/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { parseInput } from '../../common/validation/parse-input';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';
import { CatalogService } from './catalog.service';

@Controller('products')
@UseGuards(SessionGuard, RolesGuard)
export class ProductsController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.catalogService.listProducts(auth);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.getProduct(auth, id);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.catalogService.createProduct(auth, parseInput(productInputSchema, body));
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.catalogService.updateProduct(auth, id, parseInput(productInputSchema, body));
  }

  @Patch(':id/publish')
  publish(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.publishProduct(auth, id);
  }

  @Patch(':id/archive')
  archive(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.archiveProduct(auth, id);
  }

  @Patch(':id/restore')
  restore(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.restoreProduct(auth, id);
  }

  @Delete(':id')
  remove(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.deleteProduct(auth, id);
  }
}
