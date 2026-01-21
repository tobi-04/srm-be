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
import { LandingPageService } from "../landing-page/landing-page.service";
import { UserService } from "../user/user.service";
import { CourseService } from "../course/course.service";
import { Types } from "mongoose";

@Controller("payment")
export class PaymentController {
  private readonly paymentFee: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
    private readonly sePayService: SePayService,
    private readonly landingPageService: LandingPageService,
    private readonly userService: UserService,
    private readonly courseService: CourseService,
  ) {
    this.paymentFee = parseInt(
      this.configService.get<string>("PAYMENT_FEE") || "700",
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
        "Invalid submission ID. Please try re-submitting the registration form on the first step.",
      );
    }

    // Fetch course price directly from database
    const course = await this.courseService.findOne(dto.course_id, true);
    if (!course) {
      throw new BadRequestException("Course not found");
    }
    const coursePrice = course.price || 0;
    console.log("💰 Course price fetched from DB:", coursePrice);

    // Calculate total amount
    const totalAmount = coursePrice + this.paymentFee;

    // Check if user is already enrolled
    const submission = await this.landingPageService.findUserSubmissionById(
      dto.user_submission_id,
    );
    if (submission) {
      const email = submission.email.toLowerCase().trim();
      const user = await this.userService.findByEmail(email);
      if (user) {
        const isEnrolled = await this.courseEnrollmentService.isUserEnrolled(
          user._id.toString(),
          dto.course_id.toString(),
        );
        if (isEnrolled) {
          throw new BadRequestException("ALREADY_ENROLLED");
        }
      }
    }

    // Create payment transaction
    const transaction = await this.paymentTransactionService.createTransaction(
      dto.course_id,
      dto.user_submission_id,
      totalAmount,
    );

    // Generate QR code and bank data using SePayService
    const sepayData = await this.sePayService.createQR(
      totalAmount,
      transaction._id.toString(),
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
    const transaction =
      await this.paymentTransactionService.getTransactionById(id);

    // Only check enrollment for pending transactions
    // If transaction is completed, user should see success page, not be redirected
    if (transaction.status === "pending") {
      // Check if user is already enrolled for this transaction's course
      const submission = await this.landingPageService.findUserSubmissionById(
        transaction.user_form_submission_id,
      );
      console.log(
        "📋 GET /transaction/:id - Submission:",
        submission?._id,
        "Email:",
        submission?.email,
      );
      if (submission) {
        const email = submission.email.toLowerCase().trim();
        const user = await this.userService.findByEmail(email);
        console.log(
          "👤 GET /transaction/:id - User found:",
          user ? user._id : "NO USER FOUND",
        );
        if (user) {
          console.log(
            "🔍 Checking enrollment - UserId:",
            user._id.toString(),
            "CourseId:",
            transaction.course_id.toString(),
          );
          const isEnrolled = await this.courseEnrollmentService.isUserEnrolled(
            user._id.toString(),
            transaction.course_id.toString(),
          );
          console.log("✅ GET /transaction/:id - isEnrolled:", isEnrolled);
          if (isEnrolled) {
            throw new BadRequestException("ALREADY_ENROLLED");
          }
        }
      }
    }

    const sepayData = await this.sePayService.createQR(
      transaction.amount,
      transaction._id.toString(),
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
