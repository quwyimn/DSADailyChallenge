import { Controller, Get, UseGuards } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgeController {
  constructor(private readonly badge: BadgeService) {}

  @Get()
  getBadges(@CurrentUser() user: JwtPayload) {
    return this.badge.getUserBadges(user.sub);
  }
}
