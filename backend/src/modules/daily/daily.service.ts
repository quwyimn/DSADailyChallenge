import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmToday } from '../../common/utils/hcm-date';

@Injectable()
export class DailyService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayTasks() {
    const today = getHcmToday();

    const assignments = await this.prisma.dailyAssignment.findMany({
      where: { date: today },
      include: { task: true },
      orderBy: { id: 'asc' },
    });

    return assignments.map(({ task }) => ({
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      config: task.config,
    }));
  }
}
