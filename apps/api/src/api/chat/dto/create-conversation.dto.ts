import { ConversationType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  @IsNotEmpty()
  type: ConversationType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participantIds?: string[];
}

export class CreateDirectConversationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
