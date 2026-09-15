import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OwnUserIdGuard } from './own-user-id.guard';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/cart/by-user/:userId')
@UseGuards(OwnUserIdGuard)
export class CartController {
  constructor(@Inject(CartService) private readonly cartService: CartService) {}

  @Get()
  getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@Param('userId') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(userId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@Param('userId') userId: string): Promise<void> {
    await this.cartService.clearCart(userId);
  }
}
