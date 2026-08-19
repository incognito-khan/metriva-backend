import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ClientStatus } from "../schemas/client.schema";

export class QueryClientDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
