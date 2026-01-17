import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class SePayService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly accountNumber: string;
  private readonly bankId: string;
  private readonly systemCode: string;
  private logger = new Logger(SePayService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>("PAYMENT_SERVICE_SEPAY_KEY") ||
      process.env.PAYMENT_SERVICE_SEPAY_KEY ||
      "";
    this.baseUrl =
      this.configService.get<string>("PAYMENT_BASE_URL") ||
      process.env.PAYMENT_BASE_URL ||
      "https://my.sepay.vn";
    this.accountNumber =
      this.configService.get<string>("PAYMENT_QR_BANK_ACCOUNT") ||
      process.env.PAYMENT_QR_BANK_ACCOUNT ||
      "";
    this.bankId =
      this.configService.get<string>("PAYMENT_QR_BANK_CODE") ||
      process.env.PAYMENT_QR_BANK_CODE ||
      "";
    this.systemCode =
      this.configService.get<string>("PAYMENT_SYSTEM_CODE") ||
      process.env.PAYMENT_SYSTEM_CODE ||
      "ZLP";

    this.logger.log(
      `SePay Config: BaseUrl=${this.baseUrl}, BankAcc=${this.accountNumber}, BankCode=${this.bankId}, SystemCode=${this.systemCode}`
    );
  }

  async createQR(amount: number, paymentId: string) {
    const bankData = await this.getBankAccount();
    const bankFromApi = bankData.bankaccounts?.[0];

    // Use property mapping to handle different possible field names from SePay API
    const accNo =
      bankFromApi?.acc_no || bankFromApi?.account_number || this.accountNumber;
    const bankCode =
      bankFromApi?.bank_code || bankFromApi?.bank_id || this.bankId;
    const accName = bankFromApi?.acc_name || bankFromApi?.account_name || "";
    const bankName = bankFromApi?.bank_name || "";

    const qrUrl = `https://qr.sepay.vn/img?acc=${accNo}&bank=${bankCode}&amount=${amount}&des=${this.systemCode}${paymentId}`;

    this.logger.log(`Generated QR URL: ${qrUrl}`);

    return {
      qr_url: qrUrl,
      bank: {
        acc_no: accNo,
        bank_id: bankFromApi?.bank_id || this.bankId,
        bank_code: bankFromApi?.bank_code || this.bankId,
        bank_name: bankName,
        acc_name: accName,
      },
    };
  }

  async getBankAccount() {
    try {
      if (!this.apiKey) {
        this.logger.warn("SePay API Key is missing, skipping API call.");
        return { bankaccounts: [] };
      }

      this.logger.log(`Fetching bank accounts from SePay API: ${this.baseUrl}`);
      const response = await axios.get(
        `${this.baseUrl}/userapi/bankaccounts/list`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error getting bank accounts from SePay: ${error.message}`
      );
      return { bankaccounts: [] };
    }
  }
}
