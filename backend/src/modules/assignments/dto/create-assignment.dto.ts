import { IsInt, IsPositive, Matches } from 'class-validator';

export class CreateAssignmentDto {
  @IsInt()
  @IsPositive()
  taskId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;
}
