import { Controller, Get, Inject, Param } from '@nestjs/common';

import { CatalogService } from './catalog.service';

@Controller('public/checkout')
export class PublicCheckoutController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get(':workspaceSlug/:productSlug')
  get(@Param('workspaceSlug') workspaceSlug: string, @Param('productSlug') productSlug: string) {
    return this.catalogService.getPublicCheckout(workspaceSlug, productSlug);
  }
}
