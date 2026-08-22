import {
  checkoutIdentificationInputSchema,
  checkoutQuantityInputSchema,
  checkoutReceiptInputSchema,
  publicCheckoutSessionCreateInputSchema,
} from '@checkout/contracts';
import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';

import { parseInput } from '../../common/validation/parse-input';
import { CheckoutService } from './checkout.service';

@Controller()
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkoutService: CheckoutService) {}

  @Post('public/checkout/:workspaceSlug/:productSlug/sessions')
  createSession(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('productSlug') productSlug: string,
    @Body() body: unknown,
  ) {
    return this.checkoutService.createSession(
      workspaceSlug,
      productSlug,
      parseInput(publicCheckoutSessionCreateInputSchema, body),
    );
  }

  @Get('public/checkout-sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.checkoutService.getSession(sessionId);
  }

  @Patch('public/checkout-sessions/:sessionId/identification')
  identify(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    return this.checkoutService.identify(
      sessionId,
      parseInput(checkoutIdentificationInputSchema, body),
    );
  }

  @Patch('public/checkout-sessions/:sessionId/summary')
  confirmSummary(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    return this.checkoutService.confirmSummary(
      sessionId,
      parseInput(checkoutQuantityInputSchema, body),
    );
  }

  @Post('public/checkout-sessions/:sessionId/pix')
  createPix(@Param('sessionId') sessionId: string) {
    return this.checkoutService.createMockPix(sessionId);
  }

  @Post('public/checkout-sessions/:sessionId/pix/copied')
  markPixCopied(@Param('sessionId') sessionId: string) {
    return this.checkoutService.markPixCopied(sessionId);
  }

  @Post('public/checkout-sessions/:sessionId/receipt')
  uploadReceipt(@Param('sessionId') sessionId: string, @Body() body: unknown) {
    return this.checkoutService.uploadReceipt(
      sessionId,
      parseInput(checkoutReceiptInputSchema, body),
    );
  }

  @Post('public/checkout-sessions/:sessionId/mock-confirmation')
  confirmMockPayment(@Param('sessionId') sessionId: string) {
    return this.checkoutService.confirmMockPayment(sessionId);
  }
}
