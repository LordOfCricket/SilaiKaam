import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const ADVANCE_TARGETS = [
  'IN_PROGRESS',
  'QC',
  'REWORK_REQUIRED',
  'COMPLETED',
  'CANCELLED',
] as const;

export class AdvanceWorkflowDto {
  @IsIn(ADVANCE_TARGETS)
  status!: (typeof ADVANCE_TARGETS)[number];

  @IsString()
  @Length(1, 40)
  actorSource!: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  customerMessage?: string;
}
