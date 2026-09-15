import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { FittingWorkflowService } from './fitting-workflow.service';
import { RecordInspectionDto } from './dto/record-inspection.dto';
import { AdvanceWorkflowDto } from './dto/advance-workflow.dto';
import { RecordQualityCheckDto } from './dto/record-quality-check.dto';
import { UploadReadyPhotoDto } from './dto/upload-ready-photo.dto';

// Internal-only ops surface: not routed through the API Gateway. There is
// no staff UI yet (out of scope for this batch) — this is the workflow
// foundation, reachable only from trusted backend tooling on this network.
@Controller('internal/fitting-workflow')
export class FittingWorkflowController {
  constructor(@Inject(FittingWorkflowService) private readonly service: FittingWorkflowService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getInternal(id);
  }

  @Post(':id/inspections')
  recordInspection(@Param('id') id: string, @Body() dto: RecordInspectionDto) {
    return this.service.recordInspection(id, dto);
  }

  @Post(':id/advance')
  advance(@Param('id') id: string, @Body() dto: AdvanceWorkflowDto) {
    return this.service.advance(id, dto);
  }

  @Post(':id/quality-check')
  recordQualityCheck(@Param('id') id: string, @Body() dto: RecordQualityCheckDto) {
    return this.service.recordQualityCheck(id, dto);
  }

  @Post(':id/ready-photos')
  uploadReadyPhoto(@Param('id') id: string, @Body() dto: UploadReadyPhotoDto) {
    return this.service.uploadReadyPhoto(id, dto);
  }

  @Post(':id/ready')
  markReady(@Param('id') id: string, @Body('actorSource') actorSource: string) {
    return this.service.markReady(id, actorSource);
  }
}
