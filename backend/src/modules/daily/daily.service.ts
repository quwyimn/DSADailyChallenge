import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DailyService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayTasks() {
    const today = this.getHcmToday();

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

  // Vietnam is UTC+7 with no DST — safe to hardcode the offset.
  private getHcmToday(): Date {
    const now = new Date();
    const hcmMs = now.getTime() + 7 * 60 * 60 * 1000;
    const d = new Date(hcmMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    // Midnight UTC for this HCM calendar date — matches the DATE field in daily_assignments
    return new Date(`${y}-${m}-${day}T00:00:00.000Z`);
  }
}
