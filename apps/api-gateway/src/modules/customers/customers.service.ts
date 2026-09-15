import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AddressDto, AuthUser, CustomerProfileDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface CustomerProfileRecord {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string | null;
  addresses: AddressRecord[];
}

interface AddressRecord {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  async getProfile(user: AuthUser): Promise<CustomerProfileDto> {
    const record = await this.http.request<CustomerProfileRecord>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}`,
      headers: this.identityHeaders(user),
    });
    return this.toProfileDto(user, record);
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto): Promise<CustomerProfileDto> {
    const record = await this.http.request<CustomerProfileRecord>({
      method: 'PATCH',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}`,
      body: dto,
      headers: this.identityHeaders(user),
    });
    return this.toProfileDto(user, record);
  }

  async listAddresses(user: AuthUser): Promise<AddressDto[]> {
    const records = await this.http.request<AddressRecord[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/addresses`,
      headers: this.identityHeaders(user),
    });
    return records.map(this.toAddressDto);
  }

  async createAddress(user: AuthUser, dto: CreateAddressDto): Promise<AddressDto> {
    const record = await this.http.request<AddressRecord>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/addresses`,
      body: dto,
      headers: this.identityHeaders(user),
    });
    return this.toAddressDto(record);
  }

  async updateAddress(
    user: AuthUser,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressDto> {
    const record = await this.http.request<AddressRecord>({
      method: 'PATCH',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/addresses/${addressId}`,
      body: dto,
      headers: this.identityHeaders(user),
    });
    return this.toAddressDto(record);
  }

  async deleteAddress(user: AuthUser, addressId: string): Promise<void> {
    await this.http.request<void>({
      method: 'DELETE',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/addresses/${addressId}`,
      headers: this.identityHeaders(user),
    });
  }

  private baseUrl(): string {
    return this.config.get('USER_SERVICE_URL', { infer: true });
  }

  // Only the gateway sets these, after verifying the caller's JWT — the
  // downstream service never trusts client-supplied identity.
  private identityHeaders(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }

  private toProfileDto(user: AuthUser, record: CustomerProfileRecord): CustomerProfileDto {
    return {
      id: record.id,
      userId: record.userId,
      email: user.email,
      fullName: record.fullName,
      phone: record.phone,
      dateOfBirth: record.dateOfBirth,
      gender: record.gender,
      avatarUrl: record.avatarUrl,
      addresses: record.addresses.map(this.toAddressDto),
    };
  }

  private toAddressDto(record: AddressRecord): AddressDto {
    return {
      id: record.id,
      label: record.label,
      line1: record.line1,
      line2: record.line2,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      country: record.country,
      isDefault: record.isDefault,
    };
  }
}
