import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from "./entities/payment.entity";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentService {
  private readonly paymentFee: number;
  private readonly bankAccount: string;
  private readonly bankCode: string;
  private readonly sepayBaseUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService
  ) {
    this.paymentFee = parseInt(
      this.configService.get<string>("PAYMENT_FEE") || "700"
    );
    this.bankAccount = this.configService.get<string>(
      "PAYMENT_QR_BANK_ACCOUNT"
    );
    this.bankCode = this.configService.get<string>("PAYMENT_QR_BANK_CODE");
    this.sepayBaseUrl = this.configService.get<string>("PAYMENT_BASE_URL");
  }

  /**
   * Generate unique transfer content for tracking
   */
  private generateTransferContent(
    landingPageId: string,
    userSubmissionId: string
  ): string {
    const timestamp = Date.now();
    // Format: LP{first6chars}US{first6chars}T{timestamp}
    const lpId = landingPageId.substring(0, 6).toUpperCase();
    const usId = userSubmissionId.substring(0, 6).toUpperCase();
    return `LP${lpId}US${usId}T${timestamp}`;
  }

  /**
   * Generate SePay QR code URL
   */
  private generateQRCodeUrl(amount: number, content: string): string {
    const params = new URLSearchParams({
      bank: this.bankCode,
      acc: this.bankAccount,
      amount: amount.toString(),
      des: content,
    });
    return `${this.sepayBaseUrl}/qr?${params.toString()}`;
  }

  /**
   * Create a new payment
   */
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { user_submission_id, landing_page_id, course_price } =
      createPaymentDto;

    // Calculate total amount
    const totalAmount = course_price + this.paymentFee;

    // Generate unique transfer content
    const transferContent = this.generateTransferContent(
      landing_page_id,
      user_submission_id
    );

    // Generate QR code URL
    const qrCodeUrl = this.generateQRCodeUrl(totalAmount, transferContent);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create payment record
    const payment = new this.paymentModel({
      user_submission_id,
      landing_page_id,
      course_price,
      fee: this.paymentFee,
      total_amount: totalAmount,
      qr_code_url: qrCodeUrl,
      bank_account: this.bankAccount,
      bank_code: this.bankCode,
      transfer_content: transferContent,
      status: PaymentStatus.PENDING,
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });

    return payment.save();
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      is_deleted: false,
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  /**
   * Get payment by transfer content
   */
  async getPaymentByTransferContent(transferContent: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({
      transfer_content: transferContent,
      is_deleted: false,
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    sepayTransactionId?: string
  ): Promise<Payment> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === PaymentStatus.COMPLETED) {
      updateData.paid_at = new Date();
    }

    if (sepayTransactionId) {
      updateData.sepay_transaction_id = sepayTransactionId;
    }

    const payment = await this.paymentModel.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true }
    );

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  /**
   * Get payments by user submission
   */
  async getPaymentsByUserSubmission(
    userSubmissionId: string
  ): Promise<Payment[]> {
    return this.paymentModel
      .find({
        user_submission_id: userSubmissionId,
        is_deleted: false,
      })
      .sort({ created_at: -1 });
  }

  /**
   * Get payments by landing page
   */
  async getPaymentsByLandingPage(landingPageId: string): Promise<Payment[]> {
    return this.paymentModel
      .find({
        landing_page_id: landingPageId,
        is_deleted: false,
      })
      .sort({ created_at: -1 });
  }
}
