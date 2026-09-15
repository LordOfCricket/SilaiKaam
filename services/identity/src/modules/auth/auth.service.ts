import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Role } from '@silaikaam/types';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 12;

export interface SanitizedUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

@Injectable()
export class AuthService {
  // Explicit @Inject() token: tsx/esbuild (used for `pnpm dev`) doesn't
  // emit TypeScript's design:paramtypes metadata, which Nest's implicit
  // constructor injection relies on — without this, DI silently resolves
  // to no arguments at all in dev mode (this doesn't affect `tsc` builds).
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // role is never taken from the caller — it always defaults to CUSTOMER
    // at the database level for this public-facing registration endpoint.
    const user = await this.prisma.client.user.create({
      data: { email, passwordHash },
    });

    return this.sanitize(user);
  }

  async login(dto: LoginDto): Promise<SanitizedUser> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.client.user.findUnique({ where: { email } });

    // Same generic message whether the account doesn't exist or the
    // password is wrong, so login can't be used to enumerate accounts.
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled. Please contact support.',
      });
    }

    return this.sanitize(user);
  }

  /** Compensating action for the gateway's registration saga: if the
   * downstream customer-profile creation fails, the just-created identity
   * record is rolled back so we never leave a user with no profile. */
  async deleteById(id: string): Promise<void> {
    await this.prisma.client.user.deleteMany({ where: { id } });
  }

  private sanitize(user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  }): SanitizedUser {
    return { id: user.id, email: user.email, role: user.role as Role, isActive: user.isActive };
  }
}
