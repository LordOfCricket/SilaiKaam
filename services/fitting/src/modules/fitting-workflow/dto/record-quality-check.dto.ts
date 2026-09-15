import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const QC_OUTCOMES = ['PASS', 'REWORK_REQUIRED'] as const;

export class RecordQualityCheckDto {
  @IsIn(QC_OUTCOMES)
  outcome!: (typeof QC_OUTCOMES)[number];

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  observations?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  issues?: string;

  @IsString()
  @Length(1, 40)
  actorSource!: string;
}
