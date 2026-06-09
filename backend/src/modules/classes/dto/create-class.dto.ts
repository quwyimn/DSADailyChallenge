import { IsString } from 'class-validator';

export class CreateClassDto {
  @IsString()
  name: string;

  @IsString()
  grade: string;
}
