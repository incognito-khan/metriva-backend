import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  user!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsOptional()
  client?: string;
}
