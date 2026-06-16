import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { getHcmToday } from '../../common/utils/hcm-date';

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

  findByDate(dateStr?: string) {
    const date = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : getHcmToday();
    return this.prisma.dailyAssignment.findMany({
      where: { date },
      include: {
        task: { select: { id: true, type: true, title: true, config: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.dailyAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Assignment ${id} not found`);
    return this.prisma.dailyAssignment.delete({ where: { id } });
  }
}
