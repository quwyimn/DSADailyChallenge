import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  config: Record<string, unknown>;
}
