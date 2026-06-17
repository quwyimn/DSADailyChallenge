import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { AutoAssignService } from './auto-assign.service';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AutoAssignService],
  exports: [AutoAssignService],
})
export class AssignmentsModule {}
