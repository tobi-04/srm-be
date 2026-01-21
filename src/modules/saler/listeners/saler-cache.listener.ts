import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { RedisCacheService } from "../../../common/cache/redis-cache.service";
import { Order } from "../../order/entities/order.entity";

@Injectable()
export class SalerCacheListener {
  private readonly logger = new Logger(SalerCacheListener.name);

  constructor(private readonly redisCacheService: RedisCacheService) {}

  @OnEvent("order.paid")
  async handleOrderPaid(order: Order) {
    if (order.saler_id) {
      await this.invalidateSalerCache(order.saler_id.toString());
      this.logger.log(
        `Invalidated cache for saler ${order.saler_id} due to order.paid`,
      );
    }
  }

  @OnEvent("order.refunded")
  async handleOrderRefunded(order: Order) {
    if (order.saler_id) {
      await this.invalidateSalerCache(order.saler_id.toString());
      this.logger.log(
        `Invalidated cache for saler ${order.saler_id} due to order.refunded`,
      );
    }
  }

  /**
   * Invalidate all saler-related cache keys
   */
  private async invalidateSalerCache(salerId: string) {
    // Keys follow pattern: saler:{salerId}:{resource}:{queryHash}
    const pattern = `saler:${salerId}:*`;
    await this.redisCacheService.delByPattern(pattern);
  }
}
