import { Controller, Get, UseGuards } from '@nestjs/common';
import { DailyService } from './daily.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('daily')
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Get()
  getTodayTasks() {
    return this.daily.getTodayTasks();
  }
}
