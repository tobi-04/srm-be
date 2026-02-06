/**
 * Enum định nghĩa các loại sản phẩm trong hệ thống
 */
export enum ProductType {
  COURSE = 'COURSE',
  BOOK = 'BOOK',
  INDICATOR = 'INDICATOR',
}

/**
 * Event payload chung cho tất cả các loại thanh toán thành công
 * Event name: payment.paid
 */
export interface PaymentPaidEvent {
  payment_id: string; // ID của payment transaction
  user_id: string; // ID của user
  product_type: ProductType; // Loại sản phẩm
  product_id: string; // ID của sản phẩm (course_id, book_id, indicator_id)
  amount: number; // Số tiền thanh toán
  paid_at: Date; // Thời gian thanh toán
  metadata?: Record<string, any>; // Metadata bổ sung
}
