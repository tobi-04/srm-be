import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentTransactionService } from "../payment-transaction/payment-transaction.service";
import { CourseEnrollmentService } from "../course-enrollment/course-enrollment.service";
import { CreatePaymentTransactionDto } from "./dto/create-payment-transaction.dto";
import { SePayService } from "./sepay.service";

@Controller("payment")
export class PaymentController {
  private readonly paymentFee: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
    private readonly sePayService: SePayService
  ) {
    this.paymentFee = parseInt(
      this.configService.get<string>("PAYMENT_FEE") || "700"
    );
  }

  /**
   * Create a new payment transaction
   */
  @Post("transaction")
  async createPaymentTransaction(@Body() dto: CreatePaymentTransactionDto) {
    // Validate user_submission_id manually to provide better error message
    // if it's a legacy or temporary ID
    if (!/^[0-9a-fA-F]{24}$/.test(dto.user_submission_id)) {
      throw new BadRequestException(
        "Invalid submission ID. Please try re-submitting the registration form on the first step."
      );
    }

    // Calculate total amount
    const totalAmount = dto.course_price + this.paymentFee;

    // Create payment transaction
    const transaction = await this.paymentTransactionService.createTransaction(
      dto.course_id,
      dto.user_submission_id,
      totalAmount
    );

    // Generate QR code and bank data using SePayService
    const sepayData = await this.sePayService.createQR(
      totalAmount,
      transaction._id.toString()
    );

    return {
      transaction_id: transaction._id,
      transfer_code: transaction.transfer_code,
      amount: totalAmount,
      course_price: dto.course_price,
      fee: this.paymentFee,
      qr_code_url: sepayData.qr_url,
      bank_account: sepayData.bank.acc_no,
      bank_code: sepayData.bank.bank_code,
      bank_name: sepayData.bank.bank_name,
      account_name: sepayData.bank.acc_name,
      status: transaction.status,
    };
  }

  /**
   * Get payment transaction by ID
   */
  @Get("transaction/:id")
  async getPaymentTransaction(@Param("id") id: string) {
    const transaction = await this.paymentTransactionService.getTransactionById(
      id
    );

    const sepayData = await this.sePayService.createQR(
      transaction.amount,
      transaction._id.toString()
    );

    return {
      transaction_id: transaction._id,
      transfer_code: transaction.transfer_code,
      amount: transaction.amount,
      qr_code_url: sepayData.qr_url,
      bank_account: sepayData.bank.acc_no,
      bank_code: sepayData.bank.bank_code,
      bank_name: sepayData.bank.bank_name,
      account_name: sepayData.bank.acc_name,
      status: transaction.status,
      paid_at: transaction.paid_at,
      created_at: transaction.created_at,
    };
  }
}
