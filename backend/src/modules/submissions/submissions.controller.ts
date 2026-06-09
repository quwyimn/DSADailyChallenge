import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubmissionDto) {
    return this.submissions.create(user.sub, dto);
  }

  @Get('today')
  getToday(@CurrentUser() user: JwtPayload) {
    return this.submissions.getTodaySubmissions(user.sub);
  }
}
