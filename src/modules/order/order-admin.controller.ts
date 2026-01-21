import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { OrderService } from "./order.service";
import { OrderStatus } from "./entities/order.entity";

@ApiTags("Admin Orders Management")
@ApiBearerAuth()
@Controller("admin/orders")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
export class OrderAdminController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: "Get all orders with pagination and filtering" })
  @ApiQuery({ name: "page", type: "number", required: false })
  @ApiQuery({ name: "limit", type: "number", required: false })
  @ApiQuery({ name: "status", enum: OrderStatus, required: false })
  @ApiQuery({ name: "search", type: "string", required: false })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: any) {
    return this.orderService.findAllForAdmin(query);
  }
}
