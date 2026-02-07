import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionStatus,
} from "./entities/payment-transaction.entity";

@Injectable()
export class PaymentTransactionService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private paymentTransactionModel: Model<PaymentTransactionDocument>
  ) {}

  /**
   * Create a new payment transaction
   */
  async createTransaction(
    courseId: string,
    userFormSubmissionId: string,
    amount: number,
    metadata: Record<string, any> = {},
  ): Promise<PaymentTransaction> {
    // Check for existing pending transaction for this user and course
    const existingTransaction = await this.paymentTransactionModel.findOne({
      course_id: courseId,
      user_form_submission_id: userFormSubmissionId,
      status: PaymentTransactionStatus.PENDING,
      is_deleted: false,
    });

    if (existingTransaction) {
      // Update existing transaction with new amount and timestamp
      existingTransaction.amount = amount;
      existingTransaction.metadata = {
        ...existingTransaction.metadata,
        ...metadata,
      };
      existingTransaction.updated_at = new Date();
      await existingTransaction.save();
      return existingTransaction;
    }

    // Create transaction first to get the _id
    const transaction = await this.paymentTransactionModel.create({
      course_id: courseId,
      user_form_submission_id: userFormSubmissionId,
      amount,
      status: PaymentTransactionStatus.PENDING,
      transfer_code: "TEMP", // Temporary, will update after save
      metadata,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });

    // Generate transfer code using the _id
    const transferCode = `ZLP${transaction._id.toString()}`.toUpperCase();

    // Update with actual transfer code
    transaction.transfer_code = transferCode;
    transaction.updated_at = new Date();
    await transaction.save();

    return transaction;
  }

  /**
   * Get transaction by transfer code
   */
  async getTransactionByCode(
    transferCode: string
  ): Promise<PaymentTransaction> {
    const transaction = await this.paymentTransactionModel.findOne({
      transfer_code: transferCode,
      is_deleted: false,
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await this.paymentTransactionModel.findOne({
      _id: transactionId,
      is_deleted: false,
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transferCode: string,
    status: PaymentTransactionStatus,
    sepayTransactionId?: string
  ): Promise<PaymentTransaction> {
    const transaction = await this.getTransactionByCode(transferCode);

    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === PaymentTransactionStatus.COMPLETED) {
      updateData.paid_at = new Date();
    }

    if (sepayTransactionId) {
      updateData.sepay_transaction_id = sepayTransactionId;
    }

    const updated = await this.paymentTransactionModel.findByIdAndUpdate(
      transaction._id,
      updateData,
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException("Transaction not found");
    }

    return updated;
  }

  /**
   * Get transactions by user form submission
   */
  async getTransactionsBySubmission(
    submissionId: string
  ): Promise<PaymentTransaction[]> {
    return this.paymentTransactionModel
      .find({
        user_form_submission_id: submissionId,
        is_deleted: false,
      })
      .sort({ created_at: -1 });
  }

  /**
   * Get transactions by course
   */
  async getTransactionsByCourse(
    courseId: string
  ): Promise<PaymentTransaction[]> {
    return this.paymentTransactionModel
      .find({
        course_id: courseId,
        is_deleted: false,
      })
      .sort({ created_at: -1 });
  }
}
