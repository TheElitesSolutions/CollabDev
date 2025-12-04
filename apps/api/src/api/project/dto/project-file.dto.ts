import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateProjectFileDto {
  @IsString()
  path: string;

  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isFolder?: boolean;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateProjectFileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;
}

export class MoveProjectFileDto {
  @IsString()
  newPath: string;

  @IsString()
  @IsOptional()
  newParentId?: string;
}
