import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "./entities/order.entity";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";
import { OrderAdminController } from "./order-admin.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrderAdminController],
  providers: [OrderRepository, OrderService],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
