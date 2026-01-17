export class SepayWebhookDto {
  id: string; // SePay transaction ID
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string; // Our transfer code (ZLP...)
  content: string;
  transferType: string;
  transferAmount: number;
  accumulated: number;
  subAccount: string;
  referenceCode: string;
}
