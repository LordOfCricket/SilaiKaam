import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../customers/guards/own-user-id.guard';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/customers/by-user/:userId/wishlist')
@UseGuards(OwnUserIdGuard)
export class WishlistController {
  constructor(@Inject(WishlistService) private readonly wishlistService: WishlistService) {}

  @Get()
  list(@Param('userId') userId: string) {
    return this.wishlistService.list(userId);
  }

  @Post('items')
  add(@Param('userId') userId: string, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.add(userId, dto.productId);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('userId') userId: string, @Param('productId') productId: string): Promise<void> {
    await this.wishlistService.remove(userId, productId);
  }
}
