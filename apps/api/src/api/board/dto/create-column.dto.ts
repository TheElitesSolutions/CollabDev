import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
