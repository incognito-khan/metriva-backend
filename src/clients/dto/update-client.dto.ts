import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ClientStatus } from '../schemas/client.schema';

export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['organization'] as const)
) {
  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;
}
