import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OrderRepository } from "./order.repository";
import { Order, OrderStatus } from "./entities/order.entity";

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new order
   */
  async createOrder(orderData: Partial<Order>) {
    return this.orderRepository.create(orderData);
  }

  /**
   * Update order status and emit events for cache invalidation and commission creation
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<Order>,
  ) {
    const order = await this.orderRepository.updateStatus(
      orderId,
      status,
      additionalData,
    );

    if (!order) {
      throw new Error("Order not found");
    }

    // Emit events for downstream processing
    if (status === OrderStatus.PAID) {
      this.eventEmitter.emit("order.paid", order);
    }

    return order;
  }

  /**
   * Find orders by saler ID with pagination and filtering
   */
  async findBySalerId(
    salerId: string,
    query: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
    },
  ) {
    return this.orderRepository.findBySalerId(salerId, query);
  }

  /**
   * Get order by ID
   */
  async findById(orderId: string) {
    return this.orderRepository.findById(orderId);
  }

  /**
   * Count orders for a date range
   */
  async countBySalerIdAndDate(salerId: string, startDate: Date, endDate: Date) {
    return this.orderRepository.countBySalerIdAndDate(
      salerId,
      startDate,
      endDate,
    );
  }

  /**
   * Sum revenue for a date range
   */
  async sumRevenueBySalerId(salerId: string, startDate: Date, endDate: Date) {
    return this.orderRepository.sumRevenueBySalerId(
      salerId,
      startDate,
      endDate,
    );
  }

  /**
   * Get daily revenue chart data
   */
  async getDailyRevenueChart(salerId: string, days: number = 30) {
    return this.orderRepository.getDailyRevenueChart(salerId, days);
  }
}
