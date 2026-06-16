import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmWeekRange } from '../../common/utils/hcm-date';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyStats() {
    const { weekStart, weekEnd } = getHcmWeekRange();

    const [classes, submissions] = await Promise.all([
      this.prisma.class.findMany({
        include: { users: { select: { id: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.submission.findMany({
        where: { createdAt: { gte: weekStart, lte: weekEnd } },
        select: { userId: true, points: true },
      }),
    ]);

    // Build per-user aggregates for the week
    const subsByUser = new Map<number, { count: number; points: number }>();
    for (const s of submissions) {
      const entry = subsByUser.get(s.userId) ?? { count: 0, points: 0 };
      entry.count += 1;
      entry.points += s.points;
      subsByUser.set(s.userId, entry);
    }

    const rows = classes.map((cls) => {
      const totalStudents = cls.users.length;
      let studentsCompleted = 0;
      let totalSubmissions = 0;
      let totalPoints = 0;

      for (const { id } of cls.users) {
        const sub = subsByUser.get(id);
        if (sub) {
          studentsCompleted++;
          totalSubmissions += sub.count;
          totalPoints += sub.points;
        }
      }

      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        totalStudents,
        studentsCompleted,
        completionRate:
          totalStudents > 0 ? Math.round((studentsCompleted / totalStudents) * 100) : 0,
        totalSubmissions,
        totalPoints,
      };
    });

    return rows.sort((a, b) => b.completionRate - a.completionRate);
  }
}
