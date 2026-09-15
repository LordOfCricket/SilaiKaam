import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.client.customerProfile.create({
        data: { userId: dto.userId, fullName: dto.fullName },
        include: { addresses: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException({
          code: 'CUSTOMER_PROFILE_ALREADY_EXISTS',
          message: 'A customer profile already exists for this account.',
        });
      }
      throw error;
    }
  }

  async findByUserId(userId: string) {
    const profile = await this.findProfileOrThrow(userId);
    return profile;
  }

  async updateByUserId(userId: string, dto: UpdateCustomerDto) {
    const profile = await this.findProfileOrThrow(userId);
    return this.prisma.client.customerProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender ?? null,
        avatarUrl: dto.avatarUrl ?? null,
      },
      include: { addresses: { where: { isActive: true } } },
    });
  }

  async listAddresses(userId: string) {
    const profile = await this.findProfileOrThrow(userId);
    return this.prisma.client.address.findMany({
      where: { customerProfileId: profile.id, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const profile = await this.findProfileOrThrow(userId);

    return this.prisma.client.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerProfileId: profile.id, isActive: true },
          data: { isDefault: false },
        });
      }

      const existingCount = await tx.address.count({
        where: { customerProfileId: profile.id, isActive: true },
      });

      return tx.address.create({
        data: {
          customerProfileId: profile.id,
          label: dto.label || null,
          line1: dto.line1,
          line2: dto.line2 || null,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country || 'IN',
          // The very first address for a customer is always the default —
          // forced true regardless of dto.isDefault (a form always submits
          // an explicit boolean, so `dto.isDefault ?? ...` would never
          // fall through to this default when the client sends `false`).
          isDefault: existingCount === 0 ? true : Boolean(dto.isDefault),
        },
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const profile = await this.findProfileOrThrow(userId);
    const address = await this.findOwnedAddressOrThrow(profile.id, addressId);

    return this.prisma.client.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerProfileId: profile.id, isActive: true, id: { not: address.id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: address.id },
        data: {
          label: dto.label ?? address.label,
          line1: dto.line1 ?? address.line1,
          line2: dto.line2 ?? address.line2,
          city: dto.city ?? address.city,
          state: dto.state ?? address.state,
          postalCode: dto.postalCode ?? address.postalCode,
          country: dto.country ?? address.country,
          isDefault: dto.isDefault ?? address.isDefault,
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const profile = await this.findProfileOrThrow(userId);
    const address = await this.findOwnedAddressOrThrow(profile.id, addressId);

    // Soft delete: historical order-address snapshots (added in a later
    // phase) must keep working even after a customer removes an address.
    await this.prisma.client.address.update({
      where: { id: address.id },
      data: { isActive: false, isDefault: false },
    });
  }

  private async findProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({
      where: { userId },
      include: { addresses: { where: { isActive: true } } },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'CUSTOMER_PROFILE_NOT_FOUND',
        message: 'Profile not found.',
      });
    }
    return profile;
  }

  private async findOwnedAddressOrThrow(customerProfileId: string, addressId: string) {
    const address = await this.prisma.client.address.findFirst({
      where: { id: addressId, customerProfileId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' });
    }
    return address;
  }
}
