import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@silaikaam/validation';
import { IsEmail, Length, Matches } from 'class-validator';

// Identity-service only ever creates CUSTOMER accounts via this endpoint —
// there is intentionally no `role` field, so a caller can never assign one.
export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password!: string;
}
