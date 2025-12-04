import { ProjectRole } from '@prisma/client';

export class ProjectMemberDto {
  id: string;
  role: ProjectRole;
  userId: string;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
    image?: string;
  };
  createdAt: Date;
}

export class ProjectDto {
  id: string;
  name: string;
  description?: string;
  createdByUserId: string;
  createdBy: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  members?: ProjectMemberDto[];
  createdAt: Date;
  updatedAt: Date;
}
