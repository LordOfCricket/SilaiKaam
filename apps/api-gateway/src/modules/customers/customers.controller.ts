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
import type { AddressDto, AuthUser, CustomerProfileDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Every route here is scoped to "me" — the authenticated customer's own
// record, derived from the verified session, never from a client-supplied
// id. There is no route that accepts another customer's id.
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthUser): Promise<CustomerProfileDto> {
    return this.customersService.getProfile(user);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<CustomerProfileDto> {
    return this.customersService.updateProfile(user, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser() user: AuthUser): Promise<AddressDto[]> {
    return this.customersService.listAddresses(user);
  }

  @Post('me/addresses')
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto): Promise<AddressDto> {
    return this.customersService.createAddress(user, dto);
  }

  @Patch('me/addresses/:addressId')
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressDto> {
    return this.customersService.updateAddress(user, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAddress(
    @CurrentUser() user: AuthUser,
    @Param('addressId') addressId: string,
  ): Promise<void> {
    return this.customersService.deleteAddress(user, addressId);
  }
}
