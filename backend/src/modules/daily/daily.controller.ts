import { Controller, Get, UseGuards } from '@nestjs/common';
import { DailyService } from './daily.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('daily')
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Get()
  getTodayTasks(@CurrentUser() user: JwtPayload) {
    return this.daily.getTodayTasks(user.sub);
  }
}
