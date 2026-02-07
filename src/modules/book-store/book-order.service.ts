import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BookOrder, BookOrderStatus } from "./entities/book-order.entity";
import { BookOrderItem } from "./entities/book-order-item.entity";
import { Coupon, CouponDocument, CouponType } from "./entities/coupon.entity";
import { CreateBookOrderDto } from "./dto/book-order.dto";
import { BookStoreService } from "./book-store.service";
import { SePayService } from "../payment/sepay.service";
import { UserService } from "../user/user.service";
import { UserRole } from "../user/entities/user.entity";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

@Injectable()
export class BookOrderService {
  private readonly logger = new Logger(BookOrderService.name);

  constructor(
    @InjectModel(BookOrder.name)
    private readonly bookOrderModel: Model<BookOrder>,
    @InjectModel(BookOrderItem.name)
    private readonly bookOrderItemModel: Model<BookOrderItem>,
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    private readonly bookStoreService: BookStoreService,
    private readonly sePayService: SePayService,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process book checkout
   */
  async checkout(dto: CreateBookOrderDto) {
    const { book_id, email, name, phone, coupon_code } = dto;

    const PAYMENT_FEE = parseInt(process.env.PAYMENT_FEE || "700");

    // 1. Verify book exists
    const book = await this.bookStoreService.findOne(book_id);
    if (!book) {
      throw new NotFoundException("Book not found");
    }

    // 2. Calculate initial price with book's own discount
    let basePrice = book.price;
    const bookDiscount = book.discount_percentage || 0;
    if (bookDiscount > 0) {
      basePrice = Math.floor(book.price * (1 - bookDiscount / 100));
    }

    // 3. Handle Coupon if provided
    let appliedCouponId = null;
    let couponDiscountAmount = 0;
    let priceAfterCoupon = basePrice;

    if (coupon_code) {
      const normalizedCode = coupon_code.trim().toUpperCase();

      // First check if coupon exists at all
      const coupon = await this.couponModel.findOne({ code: normalizedCode });

      if (!coupon) {
        throw new BadRequestException("Mã giảm giá không tồn tại");
      }

      // Check if coupon is active
      if (!coupon.is_active) {
        throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
      }

      // Check Expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new BadRequestException("Mã giảm giá đã hết hạn");
      }

      // Check Usage Limit
      if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
        throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
      }

      // Apply Coupon
      if (coupon.type === CouponType.PERCENTAGE) {
        couponDiscountAmount = Math.floor(basePrice * (coupon.value / 100));
      } else {
        couponDiscountAmount = coupon.value;
      }

      priceAfterCoupon = Math.max(0, basePrice - couponDiscountAmount);
      appliedCouponId = coupon._id;
    }

    const finalPrice = priceAfterCoupon + PAYMENT_FEE;

    // 4. Find or create user
    let user = await this.userService.findByEmail(email.toLowerCase().trim());
    let isNewUser = false;

    if (!user) {
      const password = `BK${Math.floor(100000 + Math.random() * 900000)}`;
      user = await this.userService.create({
        email: email.toLowerCase().trim(),
        name,
        password,
        role: UserRole.USER,
        must_change_password: true,
      } as any);
      isNewUser = true;
    }

    // 5. Check for existing PENDING order for this user + book
    const existingOrderItem = await this.bookOrderItemModel.findOne({
      book_id: new Types.ObjectId(book_id),
    });

    let existingOrder = null;
    if (existingOrderItem) {
      existingOrder = await this.bookOrderModel.findOne({
        _id: existingOrderItem.order_id,
        user_id: user._id,
        status: BookOrderStatus.PENDING,
      });
    }

    let order;
    let orderItem;

    if (existingOrder) {
      // Reuse existing order - update metadata only
      existingOrder.total_amount = finalPrice;
      existingOrder.metadata = {
        ...existingOrder.metadata,
        customer_name: name,
        customer_phone: phone,
        original_price: book.price,
        book_discount_percentage: bookDiscount,
        coupon_code: coupon_code?.toUpperCase(),
        coupon_discount_amount: couponDiscountAmount,
        payment_fee: PAYMENT_FEE,
      };

      // Regenerate QR code with updated amount
      const qrData = await this.sePayService.createQR(
        finalPrice,
        existingOrder.transfer_code,
      );
      existingOrder.qr_code_url = qrData.qr_url;

      await existingOrder.save();

      // Update order item price
      await this.bookOrderItemModel.updateOne(
        { order_id: existingOrder._id },
        { price: finalPrice },
      );

      return {
        order_id: existingOrder._id,
        qr_code_url: qrData.qr_url,
        transfer_code: existingOrder.transfer_code,
        amount: finalPrice,
        bank: qrData.bank,
        is_new_user: isNewUser,
        email: user.email,
      };
    }

    // 6. Create new Book Order
    order = new this.bookOrderModel({
      user_id: user._id,
      total_amount: finalPrice,
      status: BookOrderStatus.PENDING,
      transfer_code: "TEMP",
      metadata: {
        customer_name: name,
        customer_phone: phone,
        is_new_user: isNewUser,
        original_price: book.price,
        book_discount_percentage: bookDiscount,
        coupon_code: coupon_code?.toUpperCase(),
        coupon_discount_amount: couponDiscountAmount,
        payment_fee: PAYMENT_FEE,
      },
    });

    // 7. Create Order Item
    orderItem = new this.bookOrderItemModel({
      order_id: order._id,
      book_id: new Types.ObjectId(book_id),
      book_title: book.title,
      price: finalPrice,
    });

    await orderItem.save();

    // 8. Generate tracking code
    const transferCode =
      `BZLP${order._id.toString().substring(18)}`.toUpperCase();
    order.transfer_code = transferCode;

    // 9. Generate SePay QR
    const qrData = await this.sePayService.createQR(finalPrice, transferCode);
    order.qr_code_url = qrData.qr_url;

    await order.save();

    return {
      order_id: order._id,
      qr_code_url: qrData.qr_url,
      transfer_code: transferCode,
      amount: finalPrice,
      bank: qrData.bank,
      is_new_user: isNewUser,
      email: user.email,
    };
  }

  async getOrderStatus(orderId: string) {
    const order = await this.bookOrderModel.findById(orderId);
    if (!order) throw new NotFoundException("Order not found");

    return {
      status: order.status,
      paid_at: order.paid_at,
    };
  }

  async cancelOrder(orderId: string) {
    const order = await this.bookOrderModel.findById(orderId);
    if (!order) throw new NotFoundException("Order not found");

    // Only allow canceling PENDING orders
    if (order.status !== BookOrderStatus.PENDING) {
      throw new BadRequestException(
        "Chỉ có thể hủy đơn hàng đang chờ thanh toán",
      );
    }

    // Delete order items first
    await this.bookOrderItemModel.deleteMany({ order_id: order._id });

    // Delete the order
    await this.bookOrderModel.findByIdAndDelete(orderId);

    return { success: true, message: "Đơn hàng đã được hủy" };
  }

  @OnEvent("book.payment.confirmed")
  async handlePaymentConfirmed(payload: {
    transferCode: string;
    sepayTransactionId: string;
  }) {
    const { transferCode, sepayTransactionId } = payload;
    const order = await this.bookOrderModel.findOne({
      transfer_code: transferCode,
      status: BookOrderStatus.PENDING,
    });

    if (!order) {
      this.logger.warn(`No pending book order found for code: ${transferCode}`);
      return;
    }

    order.status = BookOrderStatus.PAID;
    order.paid_at = new Date();
    order.sepay_transaction_id = sepayTransactionId;
    await order.save();

    // Increment coupon usage count if applied
    if (order.metadata?.coupon_code) {
      try {
        await this.couponModel.updateOne(
          { code: order.metadata.coupon_code.toUpperCase() },
          { $inc: { usage_count: 1 } },
        );
        this.logger.log(`✅ Coupon usage incremented for: ${order.metadata.coupon_code}`);
      } catch (couponErr) {
        this.logger.error(`❌ Failed to increment coupon usage: ${couponErr.message}`);
      }
    }

    const items = await this.bookOrderItemModel.find({ order_id: order._id });
    for (const item of items) {
      await this.bookStoreService.grantAccess(
        order.user_id.toString(),
        item.book_id.toString(),
      );
    }

    const user = await this.userService.findOne(order.user_id.toString());
    this.eventEmitter.emit("book.purchased", {
      userId: user._id.toString(),
      orderId: order._id.toString(),
      email: user.email,
      name: user.name,
      amount: order.total_amount,
      books: items.map((i) => ({ id: i.book_id, title: i.book_title })),
      purchasedAt: order.paid_at,
    });

    // Emit unified payment.paid event for Telegram notification
    this.eventEmitter.emit("payment.paid", {
      payment_id: order._id.toString(),
      user_id: user._id.toString(),
      product_type: "BOOK",
      product_id: items[0]?.book_id.toString(), // First book in order
      amount: order.total_amount,
      paid_at: order.paid_at,
      metadata: {
        book_title: items[0]?.book_title,
        total_books: items.length,
      },
    });
  }
}
