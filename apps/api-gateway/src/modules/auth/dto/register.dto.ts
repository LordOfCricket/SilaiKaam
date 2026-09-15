import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@silaikaam/validation';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Match } from './match.decorator';

export class RegisterDto {
  @IsString()
  @Length(2, 80, { message: 'Full name must be between 2 and 80 characters.' })
  fullName!: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password!: string;

  @IsString()
  @Match('password', { message: 'Passwords do not match.' })
  confirmPassword!: string;
}
