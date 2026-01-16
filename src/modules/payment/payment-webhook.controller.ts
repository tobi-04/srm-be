import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { PaymentTransactionService } from "../payment-transaction/payment-transaction.service";
import { CourseEnrollmentService } from "../course-enrollment/course-enrollment.service";
import { UserService } from "../user/user.service";
import { LandingPageService } from "../landing-page/landing-page.service";
import { SepayWebhookDto } from "./dto/sepay-webhook.dto";
import { PaymentTransactionStatus } from "../payment-transaction/entities/payment-transaction.entity";
import { UserRole } from "../user/entities/user.entity";
import * as bcrypt from "bcryptjs";

@Controller("payment/webhook")
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);
  private readonly sepayApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
    private readonly userService: UserService,
    private readonly landingPageService: LandingPageService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.sepayApiKey =
      this.configService.get<string>("PAYMENT_SERVICE_SEPAY_KEY") || "";
  }

  @Post("sepay")
  async handleSepayWebhook(
    @Headers("authorization") authHeader: string,
    @Body() webhookData: SepayWebhookDto
  ) {
    this.logger.log("📥 Received SePay webhook");
    this.logger.debug("Webhook data:", JSON.stringify(webhookData, null, 2));

    // 1. Verify API Key
    if (!authHeader || !authHeader.startsWith("Apikey ")) {
      this.logger.error("❌ Missing or invalid authorization header");
      throw new UnauthorizedException("Invalid authorization header");
    }

    const apiKey = authHeader.replace("Apikey ", "");
    if (apiKey !== this.sepayApiKey) {
      this.logger.error("❌ Invalid API key");
      throw new UnauthorizedException("Invalid API key");
    }

    this.logger.log("✅ API key verified");

    // 2. Find transaction by transfer code
    const transferCode = webhookData.code?.trim().toUpperCase();
    if (!transferCode || !transferCode.startsWith("ZLP")) {
      this.logger.error("❌ Invalid transfer code:", transferCode);
      throw new BadRequestException("Invalid transfer code");
    }

    let transaction;
    try {
      transaction = await this.paymentTransactionService.getTransactionByCode(
        transferCode
      );
    } catch (error) {
      this.logger.error("❌ Transaction not found:", transferCode);
      throw new BadRequestException("Transaction not found");
    }

    this.logger.log(`📦 Found transaction: ${transaction._id}`);

    // 3. Verify amount matches
    if (webhookData.transferAmount !== transaction.amount) {
      this.logger.error(
        `❌ Amount mismatch: expected ${transaction.amount}, got ${webhookData.transferAmount}`
      );
      throw new BadRequestException("Amount mismatch");
    }

    this.logger.log("✅ Amount verified");

    // 4. Check if already processed
    if (transaction.status === PaymentTransactionStatus.COMPLETED) {
      this.logger.warn("⚠️ Transaction already completed");
      return {
        success: true,
        message: "Transaction already processed",
      };
    }

    // 5. Update transaction status
    await this.paymentTransactionService.updateTransactionStatus(
      transferCode,
      PaymentTransactionStatus.COMPLETED,
      webhookData.id
    );

    this.logger.log("✅ Transaction status updated to COMPLETED");

    // 6. Get user form submission to find email
    // Note: We need to add a method to get submission by ID
    // For now, we'll extract from transaction metadata or create user directly

    // 7. Get submission details for event data
    const submission = await this.landingPageService.findUserSubmissionById(
      transaction.user_form_submission_id
    );

    // 8. Create or find user account
    const { user, tempPassword } = await this.createOrFindUser(transaction);

    this.logger.log(`👤 User account: ${user._id}`);

    // 9. Create course enrollment
    try {
      await this.courseEnrollmentService.createEnrollment(
        user._id.toString(),
        transaction.course_id,
        transaction._id.toString()
      );

      this.logger.log("✅ Course enrollment created");

      // Emit event for email automation
      this.eventEmitter.emit("course.purchased", {
        userId: user._id.toString(),
        courseId: transaction.course_id,
        courseTitle: transaction.metadata?.course_title || "Khóa học",
        amount: transaction.amount,
        purchasedAt: new Date(),
        tempPassword: tempPassword, // Will be undefined if user already existed
        isNewUser: !!tempPassword,
        email: submission.email, // Use email from submission
        name: submission.name, // Use name from submission
        submissionId: submission._id.toString(),
      });
    } catch (error: any) {
      if (error.message.includes("already enrolled")) {
        this.logger.warn("⚠️ User already enrolled in course");
      } else {
        throw error;
      }
    }

    // 9. TODO: Send confirmation email (optional)

    this.logger.log("🎉 Webhook processed successfully");

    return {
      success: true,
      message: "Payment processed successfully",
      transaction_id: transaction._id,
      user_id: user._id,
    };
  }

  /**
   * Create or find user account based on submission email
   */
  private async createOrFindUser(
    transaction: any
  ): Promise<{ user: any; tempPassword?: string }> {
    // Get user form submission to extract email and name
    const submission = await this.landingPageService.findUserSubmissionById(
      transaction.user_form_submission_id
    );

    const email = submission.email.toLowerCase().trim();

    // Check if user exists
    let user = await this.userService.findByEmail(email);

    if (user) {
      this.logger.log(`👤 User already exists: ${email}`);
      return { user };
    }

    // Generate random 6-digit password
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const password = `ZLP${randomDigits}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    user = await this.userService.create({
      email,
      password: hashedPassword,
      name: submission.name || "New User",
      role: UserRole.USER,
      must_change_password: true,
    } as any);

    this.logger.log(`✅ User created: ${email} with password: ${password}`);

    return { user, tempPassword: password };
  }
}
