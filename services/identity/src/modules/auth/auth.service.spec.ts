import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

type FakeUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
};

function buildPrismaMock(initialUsers: FakeUser[] = []) {
  const users = [...initialUsers];
  return {
    client: {
      user: {
        findUnique: jest.fn(({ where: { email } }: { where: { email: string } }) =>
          Promise.resolve(users.find((u) => u.email === email) ?? null),
        ),
        create: jest.fn(({ data }: { data: { email: string; passwordHash: string } }) => {
          const user: FakeUser = {
            id: `user-${users.length + 1}`,
            email: data.email,
            passwordHash: data.passwordHash,
            role: 'CUSTOMER',
            isActive: true,
          };
          users.push(user);
          return Promise.resolve(user);
        }),
        deleteMany: jest.fn(({ where: { id } }: { where: { id: string } }) => {
          const index = users.findIndex((u) => u.id === id);
          if (index >= 0) users.splice(index, 1);
          return Promise.resolve({ count: index >= 0 ? 1 : 0 });
        }),
      },
    },
  } as unknown as PrismaService;
}

describe('AuthService', () => {
  describe('register', () => {
    it('creates a CUSTOMER account with a hashed password', async () => {
      const prisma = buildPrismaMock();
      const service = new AuthService(prisma);

      const result = await service.register({ email: 'New@Example.com', password: 'Passw0rd!' });

      expect(result).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        role: 'CUSTOMER',
        isActive: true,
      });
      const stored = await prisma.client.user.findUnique({ where: { email: 'new@example.com' } });
      expect(stored?.passwordHash).not.toBe('Passw0rd!');
      expect(await bcrypt.compare('Passw0rd!', stored!.passwordHash)).toBe(true);
    });

    it('rejects a duplicate email', async () => {
      const prisma = buildPrismaMock([
        {
          id: 'user-1',
          email: 'taken@example.com',
          passwordHash: 'x',
          role: 'CUSTOMER',
          isActive: true,
        },
      ]);
      const service = new AuthService(prisma);

      await expect(
        service.register({ email: 'taken@example.com', password: 'Passw0rd!' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    async function seedUser(overrides: Partial<FakeUser> = {}) {
      const passwordHash = await bcrypt.hash('Passw0rd!', 4);
      return buildPrismaMock([
        {
          id: 'user-1',
          email: 'jane@example.com',
          passwordHash,
          role: 'CUSTOMER',
          isActive: true,
          ...overrides,
        },
      ]);
    }

    it('returns the sanitized user for valid credentials', async () => {
      const prisma = await seedUser();
      const service = new AuthService(prisma);

      const result = await service.login({ email: 'jane@example.com', password: 'Passw0rd!' });

      expect(result).toEqual({
        id: 'user-1',
        email: 'jane@example.com',
        role: 'CUSTOMER',
        isActive: true,
      });
    });

    it('rejects an unknown email with a generic error', async () => {
      const prisma = await seedUser();
      const service = new AuthService(prisma);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'Passw0rd!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password with the same generic error', async () => {
      const prisma = await seedUser();
      const service = new AuthService(prisma);

      await expect(
        service.login({ email: 'jane@example.com', password: 'WrongPass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a disabled account', async () => {
      const prisma = await seedUser({ isActive: false });
      const service = new AuthService(prisma);

      await expect(
        service.login({ email: 'jane@example.com', password: 'Passw0rd!' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
