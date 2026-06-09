import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAssignmentDto) {
    // Treat the admin-supplied YYYY-MM-DD as a UTC midnight date so the DATE
    // field stores the exact calendar day the admin intended.
    const date = new Date(dto.date + 'T00:00:00.000Z');
    return this.prisma.dailyAssignment.create({
      data: { taskId: dto.taskId, date },
    });
    // Duplicate (same taskId + date) throws Prisma P2002 → GlobalExceptionFilter → 409
  }
}
