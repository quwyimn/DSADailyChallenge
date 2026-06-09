import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException(`Task ${dto.taskId} not found`);

    const date = new Date(dto.date + 'T00:00:00.000Z');
    return this.prisma.dailyAssignment.create({
      data: { taskId: dto.taskId, date },
    });
    // Duplicate (same taskId + date) throws Prisma P2002 → GlobalExceptionFilter → 409
  }
}
