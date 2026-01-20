import { IsOptional, IsEnum, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "../../order/entities/order.entity";

export class SalerOrdersQuery {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
