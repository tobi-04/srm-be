import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  IndicatorSubscription,
  SubscriptionStatus,
} from "./entities/indicator-subscription.entity";
import {
  IndicatorPayment,
  PaymentStatus,
} from "./entities/indicator-payment.entity";
import {
  Coupon,
  CouponDocument,
  CouponType,
  ApplicableResourceType,
} from "../book-store/entities/coupon.entity";
import { CreateSubscriptionDto } from "./dto/subscription.dto";
import { IndicatorStoreService } from "./indicator-store.service";
import { SePayService } from "../payment/sepay.service";
import { UserService } from "../user/user.service";
import { UserRole } from "../user/entities/user.entity";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

/**
 * Số ngày mỗi chu kỳ subscription (có thể config)
 */
const SUBSCRIPTION_PERIOD_DAYS = 30;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(IndicatorSubscription.name)
    private readonly subscriptionModel: Model<IndicatorSubscription>,
    @InjectModel(IndicatorPayment.name)
    private readonly paymentModel: Model<IndicatorPayment>,
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    private readonly indicatorService: IndicatorStoreService,
    private readonly sePayService: SePayService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process indicator subscription checkout
   * Flow tương tự book checkout
   */
  async subscribe(dto: CreateSubscriptionDto) {
    const { indicator_id, email, name, phone, auto_renew, coupon_code } = dto;

    const PAYMENT_FEE = parseInt(process.env.PAYMENT_FEE || "700");

    // 1. Verify indicator exists and is active
    const indicator = await this.indicatorService.findOne(indicator_id);
    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    let basePrice = indicator.price_monthly;
    let appliedCouponId = null;
    let couponDiscountAmount = 0;
    let priceAfterCoupon = basePrice;

    // 1.5 Handle Coupon
    if (coupon_code) {
      const normalizedCode = coupon_code.trim().toUpperCase();
      const coupon = await this.couponModel.findOne({ code: normalizedCode });

      if (!coupon) {
        throw new BadRequestException("Mã giảm giá không tồn tại");
      }

      if (!coupon.is_active) {
        throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new BadRequestException("Mã giảm giá đã hết hạn");
      }

      if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
        throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
      }

      // Check if applicable to INDICATOR
      if (
        !coupon.applicable_to.includes(ApplicableResourceType.ALL) &&
        !coupon.applicable_to.includes(ApplicableResourceType.INDICATOR)
      ) {
        throw new BadRequestException(
          "Mã giảm giá không áp dụng cho indicator",
        );
      }

      if (coupon.type === CouponType.PERCENTAGE) {
        couponDiscountAmount = Math.floor(basePrice * (coupon.value / 100));
      } else {
        couponDiscountAmount = coupon.value;
      }

      priceAfterCoupon = Math.max(0, basePrice - couponDiscountAmount);
      appliedCouponId = coupon._id;
    }

    const finalPrice = priceAfterCoupon + PAYMENT_FEE;

    // 2. Find or create user
    let user = await this.userService.findByEmail(email.toLowerCase().trim());
    let isNewUser = false;

    if (!user) {
      const password = `IND${Math.floor(100000 + Math.random() * 900000)}`;
      user = await this.userService.create({
        email: email.toLowerCase().trim(),
        name,
        password,
        role: UserRole.USER,
        must_change_password: true,
      } as any);
      isNewUser = true;
    }

    // 3. Check for existing PENDING subscription for this user + indicator
    let existingSubscription = await this.subscriptionModel.findOne({
      user_id: user._id,
      indicator_id: new Types.ObjectId(indicator_id),
      status: SubscriptionStatus.PENDING,
      is_deleted: false,
    });

    if (existingSubscription) {
      // Reuse existing subscription - update metadata and regenerate QR
      existingSubscription.auto_renew = auto_renew || false;
      existingSubscription.metadata = {
        ...existingSubscription.metadata,
        customer_name: name,
        customer_phone: phone,
        indicator_name: indicator.name,
        price: finalPrice,
        original_price: indicator.price_monthly,
        coupon_code: coupon_code?.toUpperCase(),
        coupon_discount_amount: couponDiscountAmount,
        payment_fee: PAYMENT_FEE,
      };

      const qrData = await this.sePayService.createQR(
        finalPrice,
        existingSubscription.transfer_code,
      );
      existingSubscription.qr_code_url = qrData.qr_url;

      await existingSubscription.save();

      return {
        subscription_id: existingSubscription._id,
        qr_code_url: qrData.qr_url,
        transfer_code: existingSubscription.transfer_code,
        amount: finalPrice,
        bank: qrData.bank,
        is_new_user: isNewUser,
        email: user.email,
      };
    }

    // 4. Create new subscription
    const subscription = new this.subscriptionModel({
      user_id: user._id,
      indicator_id: new Types.ObjectId(indicator_id),
      status: SubscriptionStatus.PENDING,
      auto_renew: auto_renew || false,
      transfer_code: "TEMP",
      metadata: {
        customer_name: name,
        customer_phone: phone,
        is_new_user: isNewUser,
        indicator_name: indicator.name,
        price: finalPrice,
        original_price: indicator.price_monthly,
        coupon_code: coupon_code?.toUpperCase(),
        coupon_discount_amount: couponDiscountAmount,
        payment_fee: PAYMENT_FEE,
      },
    });

    // 5. Generate tracking code
    const transferCode =
      `INDP${subscription._id.toString().substring(18)}`.toUpperCase();
    subscription.transfer_code = transferCode;

    // 6. Generate SePay QR
    const qrData = await this.sePayService.createQR(finalPrice, transferCode);
    subscription.qr_code_url = qrData.qr_url;

    await subscription.save();

    return {
      subscription_id: subscription._id,
      qr_code_url: qrData.qr_url,
      transfer_code: transferCode,
      amount: finalPrice,
      bank: qrData.bank,
      is_new_user: isNewUser,
      email: user.email,
    };
  }

  async getSubscriptionStatus(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) throw new NotFoundException("Subscription not found");

    return {
      status: subscription.status,
      start_at: subscription.start_at,
      end_at: subscription.end_at,
    };
  }

  async cancelSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) throw new NotFoundException("Subscription not found");

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new BadRequestException(
        "Chỉ có thể hủy subscription đang chờ thanh toán",
      );
    }

    await this.subscriptionModel.findByIdAndDelete(subscriptionId);

    return { success: true, message: "Subscription đã được hủy" };
  }

  /**
   * Handle payment confirmation from SePay webhook
   */
  @OnEvent("indicator.payment.confirmed")
  async handlePaymentConfirmed(payload: {
    transferCode: string;
    sepayTransactionId: string;
  }) {
    const { transferCode, sepayTransactionId } = payload;
    const subscription = await this.subscriptionModel.findOne({
      transfer_code: transferCode,
      status: SubscriptionStatus.PENDING,
    });

    if (!subscription) {
      this.logger.warn(
        `No pending indicator subscription found for code: ${transferCode}`,
      );
      return;
    }

    // Calculate subscription period
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + SUBSCRIPTION_PERIOD_DAYS);

    // Update subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.start_at = startAt;
    subscription.end_at = endAt;
    await subscription.save();

    // Increment coupon usage count if applied
    if (subscription.metadata?.coupon_code) {
      try {
        await this.couponModel.updateOne(
          { code: subscription.metadata.coupon_code.toUpperCase() },
          { $inc: { usage_count: 1 } },
        );
        this.logger.log(
          `✅ Coupon usage incremented for: ${subscription.metadata.coupon_code}`,
        );
      } catch (couponErr) {
        this.logger.error(
          `❌ Failed to increment coupon usage: ${couponErr.message}`,
        );
      }
    }

    // Create payment record
    const payment = new this.paymentModel({
      subscription_id: subscription._id,
      amount: subscription.metadata.price,
      period_start: startAt,
      period_end: endAt,
      status: PaymentStatus.PAID,
      paid_at: new Date(),
      sepay_transaction_id: sepayTransactionId,
    });
    await payment.save();

    // Get user and indicator info for emails
    const user = await this.userService.findOne(
      subscription.user_id.toString(),
    );
    const indicator = await this.indicatorService.findOne(
      subscription.indicator_id.toString(),
    );

    // Emit event for email automation
    this.eventEmitter.emit("indicator.subscribed", {
      userId: user._id.toString(),
      subscriptionId: subscription._id.toString(),
      userEmail: user.email,
      userName: user.name,
      indicatorId: indicator._id.toString(),
      indicatorName: indicator.name,
      indicatorContactEmail: indicator.contact_email,
      indicatorContactTelegram: indicator.contact_telegram,
      indicatorOwnerName: indicator.owner_name,
      amount: subscription.metadata.price,
      startAt,
      endAt,
      isNewUser: subscription.metadata.is_new_user,
    });

    // Emit unified payment.paid event for Telegram notification
    this.eventEmitter.emit("payment.paid", {
      payment_id: payment._id.toString(),
      user_id: user._id.toString(),
      product_type: "INDICATOR",
      product_id: indicator._id.toString(),
      amount: subscription.metadata.price,
      paid_at: payment.paid_at,
      metadata: {
        indicator_name: indicator.name,
        start_at: startAt,
        end_at: endAt,
      },
    });
  }

  /**
   * Get user's subscriptions
   */
  async getMySubscriptions(userId: string) {
    const subscriptions = await this.subscriptionModel
      .find({
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
        },
      })
      .sort({ created_at: -1 });

    const result = [];
    for (const sub of subscriptions) {
      const indicator = await this.indicatorService.findOne(
        sub.indicator_id.toString(),
        true, // admin mode to get all info
      );

      result.push({
        _id: sub._id,
        indicator: {
          _id: indicator._id,
          name: indicator.name,
          slug: indicator.slug,
          cover_image: indicator.cover_image,
          // Include contact info for active subscriptions
          ...(sub.status === SubscriptionStatus.ACTIVE && {
            contact_email: indicator.contact_email,
            contact_telegram: indicator.contact_telegram,
            owner_name: indicator.owner_name,
            description_detail: indicator.description_detail,
          }),
        },
        status: sub.status,
        start_at: sub.start_at,
        end_at: sub.end_at,
        auto_renew: sub.auto_renew,
      });
    }

    return result;
  }

  /**
   * Admin: Get all subscriptions
   */
  async adminGetSubscriptions(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.subscriptionModel
        .find({ is_deleted: false })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user_id", "email name")
        .populate("indicator_id", "name slug"),
      this.subscriptionModel.countDocuments({ is_deleted: false }),
    ]);

    return {
      items,
      meta: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
