import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FIT_PREFERENCES,
  MEASUREMENT_KEYS,
  type FitPreference,
  type MeasurementKey,
} from '@silaikaam/types';
import { MEASUREMENT_MAX, MEASUREMENT_MIN } from '@silaikaam/validation';

export class MeasurementInputDto {
  @IsIn(MEASUREMENT_KEYS)
  key!: MeasurementKey;

  @IsNumber({}, { message: 'Enter a number.' })
  @Min(MEASUREMENT_MIN, { message: `Measurement must be at least ${MEASUREMENT_MIN} inch.` })
  @Max(MEASUREMENT_MAX, { message: `Measurement must be at most ${MEASUREMENT_MAX} inches.` })
  value!: number;
}

export class UpsertFitProfileDto {
  @IsString()
  @Length(2, 60, { message: 'Give this profile a name.' })
  label!: string;

  @IsIn(FIT_PREFERENCES)
  fitPreference!: FitPreference;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Notes must be at most 500 characters.' })
  notes?: string;

  @IsArray()
  @ArrayMaxSize(MEASUREMENT_KEYS.length)
  @ValidateNested({ each: true })
  @Type(() => MeasurementInputDto)
  measurements!: MeasurementInputDto[];
}
