import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChallengeRegistryService,
  ) {}

  findAll() {
    return this.prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto) {
    this.assertKnownType(dto.type);
    this.assertValidConfig(dto.type, dto.config);
    return this.prisma.task.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        // Record<string, unknown> → Prisma.InputJsonValue cast isolated here
        config: dto.config as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: number, dto: UpdateTaskDto) {
    const task = await this.findById(id);

    const newType = dto.type ?? task.type;
    this.assertKnownType(newType);

    if (dto.type !== undefined || dto.config !== undefined) {
      // task.config is Prisma.JsonValue — safe to cast because config is always
      // stored as an object (enforced by CreateTaskDto) and never null.
      const newConfig = (dto.config ?? task.config) as Record<string, unknown>;
      this.assertValidConfig(newType, newConfig);
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.config !== undefined && { config: dto.config as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.prisma.task.delete({ where: { id } });
  }

  private assertKnownType(type: string): void {
    if (!this.registry.isKnownType(type)) {
      throw new BadRequestException(
        `Unknown challenge type: "${type}". Known types: ${this.registry.listTypes().join(', ')}`,
      );
    }
  }

  private assertValidConfig(type: string, config: unknown): void {
    if (!this.registry.resolve(type).validateConfig(config)) {
      throw new BadRequestException(`Invalid config for challenge type "${type}"`);
    }
  }
}
