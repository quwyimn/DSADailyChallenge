import { Controller, Get, UseGuards } from '@nestjs/common';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('streak')
export class StreakController {
  constructor(private readonly streak: StreakService) {}

  @Get()
  getStreak(@CurrentUser() user: JwtPayload) {
    return this.streak.getStreak(user.sub);
  }
}
