import { IsArray, IsInt, IsPositive } from 'class-validator';

export class CreateSubmissionDto {
  @IsInt()
  @IsPositive()
  taskId: number;

  @IsArray()
  actions: unknown[];
}
