import { Module } from '@nestjs/common';
import { FittingWorkflowController } from './fitting-workflow.controller';
import { FittingWorkflowService } from './fitting-workflow.service';

@Module({
  controllers: [FittingWorkflowController],
  providers: [FittingWorkflowService],
  exports: [FittingWorkflowService],
})
export class FittingWorkflowModule {}
