import { z } from 'zod';
import { fullNameSchema } from './auth';

export const genderSchema = z.enum(['female', 'male', 'other', 'prefer_not_to_say']);

export const updateProfileSchema = z.object({
  fullName: fullNameSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number.')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().trim().optional().or(z.literal('')),
  gender: genderSchema.optional().or(z.literal('')),
  avatarUrl: z.string().trim().url('Enter a valid URL.').optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
  label: z
    .string()
    .trim()
    .max(40, 'Label must be at most 40 characters.')
    .optional()
    .or(z.literal('')),
  line1: z.string().trim().min(3, 'Address line 1 is required.').max(120),
  line2: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required.').max(60),
  state: z.string().trim().min(2, 'State is required.').max(60),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\- ]{3,12}$/, 'Enter a valid postal code.'),
  country: z.string().trim().min(2).max(60).default('IN'),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
