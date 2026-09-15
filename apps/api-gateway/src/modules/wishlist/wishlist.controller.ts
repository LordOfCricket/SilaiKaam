import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, WishlistItemDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class WishlistController {
  constructor(@Inject(WishlistService) private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<WishlistItemDto[]> {
    return this.wishlistService.list(user);
  }

  @Post('items')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddWishlistItemDto): Promise<WishlistItemDto> {
    return this.wishlistService.add(user, dto.productId);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('productId') productId: string): Promise<void> {
    return this.wishlistService.remove(user, productId);
  }
}
