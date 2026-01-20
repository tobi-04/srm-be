import { ApiProperty } from "@nestjs/swagger";

export class SalerDashboardResponse {
  @ApiProperty({ description: "Total orders today" })
  orders_today: number;

  @ApiProperty({ description: "Total orders this month" })
  orders_month: number;

  @ApiProperty({ description: "Total revenue (all time)" })
  total_revenue: number;

  @ApiProperty({ description: "Total commission (available + pending)" })
  total_commission: number;

  @ApiProperty({ description: "KPI completion percentage" })
  kpi_completion: number;

  @ApiProperty({ description: "30-day revenue chart data" })
  chart_data: {
    date: string;
    revenue: number;
  }[];
}

export class SalerCourseResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ description: "Referral link with saler code" })
  referral_link: string;

  @ApiProperty({ description: "Saler referral code" })
  referral_code: string;

  @ApiProperty({ description: "Commission rate percentage" })
  commission_rate: number;
}

export class SalerCoursesResponse {
  @ApiProperty({ type: [SalerCourseResponse] })
  data: SalerCourseResponse[];
}
