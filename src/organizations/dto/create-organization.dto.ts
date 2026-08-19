import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin name is required' })
  @MinLength(2, { message: 'Admin name must be at least 2 characters' })
  @MaxLength(50, { message: 'Admin name cannot exceed 50 characters' })
  adminName!: string;

  @IsEmail({}, { message: 'Invalid admin email address' })
  @IsNotEmpty({ message: 'Admin email is required' })
  adminEmail!: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin password is required' })
  @MinLength(8, { message: 'Admin password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Admin password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  adminPassword!: string;
}
