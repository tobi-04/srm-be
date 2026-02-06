# Telegram Notification Module

Module này xử lý việc gửi thông báo tự động đến Telegram Channel khi có thanh toán thành công trong hệ thống.

## Tính năng

- Gửi thông báo Telegram khi thanh toán thành công cho:
  - Khóa học (COURSE)
  - Sách điện tử (BOOK)
  - Thuê Indicator (INDICATOR)
- Event-driven architecture: không ảnh hưởng đến payment flow
- Có thể bật/tắt thông báo thông qua biến môi trường
- Tự động format message theo loại sản phẩm

## Cấu hình

### 1. Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi lệnh `/newbot` và làm theo hướng dẫn
3. Lưu lại **Bot Token** (dạng: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Thêm Bot vào Channel

1. Tạo một Telegram Channel hoặc Group
2. Thêm bot vào channel với quyền **Post Messages**
3. Lấy Chat ID:

**Cách 1: Sử dụng Telegram Bot API**
```bash
# Gửi 1 tin nhắn bất kỳ vào channel
# Sau đó gọi API để lấy chat_id
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Tìm `chat.id` trong response (thường có dạng `-100xxxxxxxxxx`)

**Cách 2: Sử dụng @userinfobot**
- Forward một tin nhắn từ channel đến [@userinfobot](https://t.me/userinfobot)
- Bot sẽ trả về thông tin bao gồm Chat ID

### 3. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# ============ Telegram Notification ============
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_ENABLED=true
```

**Giải thích:**
- `TELEGRAM_BOT_TOKEN`: Token của bot từ BotFather
- `TELEGRAM_CHAT_ID`: ID của channel/group (bắt đầu bằng `-100` cho channel)
- `TELEGRAM_ENABLED`: `true` để bật, `false` để tắt notification

## Cấu trúc Module

```
telegram/
├── dto/
│   └── payment-paid-event.dto.ts    # Event payload definition
├── listeners/
│   └── payment-notification.listener.ts  # Event listener
├── telegram.service.ts              # Telegram API service
└── telegram.module.ts               # Module definition
```

## Event Flow

```
Payment Success
    ↓
payment.paid event (unified)
    ↓
PaymentNotificationListener
    ↓
Load user & product info
    ↓
Render message by product_type
    ↓
TelegramService.sendMessage()
    ↓
Telegram Bot API
    ↓
Telegram Channel
```

## Event Payload

```typescript
{
  payment_id: string;      // ID của payment transaction
  user_id: string;         // ID của user
  product_type: ProductType; // COURSE | BOOK | INDICATOR
  product_id: string;      // ID của sản phẩm
  amount: number;          // Số tiền thanh toán
  paid_at: Date;          // Thời gian thanh toán
  metadata?: {            // Metadata tùy theo loại sản phẩm
    course_title?: string;
    book_title?: string;
    indicator_name?: string;
    start_at?: Date;
    end_at?: Date;
  };
}
```

## Message Template

### Course Payment
```
💰 THANH TOÁN THÀNH CÔNG

👤 User: user@example.com
📦 Sản phẩm: KHÓA HỌC
📘 Tên: Tên khóa học
💵 Số tiền: 500.000 ₫
🕒 Thời gian: 06/02/2026 14:30:00
```

### Book Payment
```
💰 THANH TOÁN THÀNH CÔNG

👤 User: user@example.com
📦 Sản phẩm: SÁCH
📘 Tên: Tên sách
💵 Số tiền: 200.000 ₫
🕒 Thời gian: 06/02/2026 14:30:00
```

### Indicator Subscription
```
💰 THANH TOÁN THÀNH CÔNG

👤 User: user@example.com
📦 Sản phẩm: INDICATOR
📘 Tên: Tên indicator
💵 Số tiền: 1.000.000 ₫
🕒 Thời gian: 06/02/2026 14:30:00
📅 Thời hạn: 06/02/2026 → 08/03/2026
```

## Emit Event

Các service cần emit event `payment.paid` khi thanh toán thành công:

```typescript
// Course payment
this.eventEmitter.emit('payment.paid', {
  payment_id: transaction._id.toString(),
  user_id: user._id.toString(),
  product_type: 'COURSE',
  product_id: course_id,
  amount: amount,
  paid_at: new Date(),
  metadata: {
    course_title: 'Tên khóa học',
  },
});

// Book payment
this.eventEmitter.emit('payment.paid', {
  payment_id: order._id.toString(),
  user_id: user._id.toString(),
  product_type: 'BOOK',
  product_id: book_id,
  amount: amount,
  paid_at: new Date(),
  metadata: {
    book_title: 'Tên sách',
  },
});

// Indicator subscription
this.eventEmitter.emit('payment.paid', {
  payment_id: payment._id.toString(),
  user_id: user._id.toString(),
  product_type: 'INDICATOR',
  product_id: indicator_id,
  amount: amount,
  paid_at: new Date(),
  metadata: {
    indicator_name: 'Tên indicator',
    start_at: startDate,
    end_at: endDate,
  },
});
```

## Error Handling

- Module không throw error để tránh ảnh hưởng payment flow
- Tất cả lỗi đều được log ra console
- Nếu Telegram API fail, payment vẫn thành công bình thường

## Testing

### Test gửi message thủ công

```typescript
// Trong controller hoặc service test
@Post('test-telegram')
async testTelegram() {
  await this.eventEmitter.emit('payment.paid', {
    payment_id: 'test123',
    user_id: 'user123',
    product_type: 'COURSE',
    product_id: 'course123',
    amount: 500000,
    paid_at: new Date(),
    metadata: {
      course_title: 'Khóa học test',
    },
  });

  return { success: true };
}
```

### Kiểm tra logs

```bash
# Xem log khi có payment
[TelegramService] ✅ Telegram notification enabled for chat: -100xxxxxxxxxx
[PaymentNotificationListener] 📢 Received payment.paid event for COURSE
[TelegramService] ✅ Telegram message sent successfully
[PaymentNotificationListener] ✅ Payment notification sent to Telegram
```

## Mở rộng trong tương lai

- [ ] Gửi thông báo cho nhiều channel (admin, indicator owner)
- [ ] Gửi thông báo cho các event khác:
  - payment.failed
  - subscription.expired
  - refund.completed
- [ ] Custom message template theo từng channel
- [ ] Thêm button action vào message
- [ ] Rate limiting để tránh spam
