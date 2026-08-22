import { checkoutThemeInputSchema } from '@checkout/contracts';
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

@Controller('themes')
@UseGuards(SessionGuard, RolesGuard)
export class ThemesController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.catalogService.listThemes(auth);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.getTheme(auth, id);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.catalogService.createTheme(auth, parseInput(checkoutThemeInputSchema, body));
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.catalogService.updateTheme(auth, id, parseInput(checkoutThemeInputSchema, body));
  }

  @Delete(':id')
  remove(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.catalogService.deleteTheme(auth, id);
  }
}
