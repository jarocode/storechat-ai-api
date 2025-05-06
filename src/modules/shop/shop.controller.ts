import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shop')
export class ShopController {
  // --- a protected route that returns the current shop ---
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentShop(@Req() req: Request) {
    // req.shop was set by JwtAuthGuard
    return { shop: (req as any).shop };
  }
}
