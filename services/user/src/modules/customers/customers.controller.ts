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
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { OwnUserIdGuard } from './guards/own-user-id.guard';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/customers')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get('by-user/:userId')
  @UseGuards(OwnUserIdGuard)
  findByUserId(@Param('userId') userId: string) {
    return this.customersService.findByUserId(userId);
  }

  @Patch('by-user/:userId')
  @UseGuards(OwnUserIdGuard)
  updateByUserId(@Param('userId') userId: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateByUserId(userId, dto);
  }

  @Get('by-user/:userId/addresses')
  @UseGuards(OwnUserIdGuard)
  listAddresses(@Param('userId') userId: string) {
    return this.customersService.listAddresses(userId);
  }

  @Post('by-user/:userId/addresses')
  @UseGuards(OwnUserIdGuard)
  createAddress(@Param('userId') userId: string, @Body() dto: CreateAddressDto) {
    return this.customersService.createAddress(userId, dto);
  }

  @Patch('by-user/:userId/addresses/:addressId')
  @UseGuards(OwnUserIdGuard)
  updateAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customersService.updateAddress(userId, addressId, dto);
  }

  @Delete('by-user/:userId/addresses/:addressId')
  @UseGuards(OwnUserIdGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ): Promise<void> {
    await this.customersService.deleteAddress(userId, addressId);
  }
}
