import { ApiProperty } from "@nestjs/swagger";

export class SalerKPIResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  period: string;

  @ApiProperty()
  target_revenue: number;

  @ApiProperty()
  actual_revenue: number;

  @ApiProperty()
  total_orders: number;

  @ApiProperty()
  completion_percentage: number;
}
