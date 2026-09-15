import { IsString, Length } from 'class-validator';

export class RespondActionRequestDto {
  @IsString()
  @Length(1, 1000)
  responseText!: string;
}
