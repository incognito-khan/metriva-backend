import { IsString, IsOptional, IsEmail, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ClientStatus } from '../schemas/client.schema';

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName!: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  businessCategory?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;
}
