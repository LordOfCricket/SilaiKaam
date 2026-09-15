import { z } from 'zod';

// Single source of truth for the password policy: at least 8 chars (bcrypt
// ignores bytes past 72, so we cap there too), one uppercase, one lowercase,
// one digit. Backends re-implement this as a class-validator @Matches with
// the same pattern/message rather than importing this zod schema directly.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, and a number.';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE)
  .regex(PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_MESSAGE);

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Full name must be at least 2 characters.')
  .max(80, 'Full name must be at most 80 characters.');

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
