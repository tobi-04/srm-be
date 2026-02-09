import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { EmailAutomationService } from "../modules/email-automation/services/email-automation.service";
import { EventType } from "../modules/email-automation/entities/email-automation.entity";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const automationService = app.get(EmailAutomationService);

  console.log("[SEED-EMAIL] Starting email automation seeding...");

  const defaults = [
    {
      name: "Chào mừng thành viên mới",
      description: "Gửi ngay khi người dùng đăng ký tài khoản hoặc điền form",
      event_type: EventType.USER_REGISTERED,
      steps: [
        {
          step_order: 1,
          delay_minutes: 0,
          subject_template: "Chào mừng {{user.name}} đã tham gia SRM Academy!",
          body_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SRM Academy</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2>Chào mừng bạn, {{user.name}}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại SRM Academy. Chúng tôi rất vui được đồng hành cùng bạn trên con đường phát triển sự nghiệp.</p>
                <p>Tại SRM, bạn sẽ tìm thấy các khóa học chất lượng cao về Quản trị, Marketing và Công nghệ.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://yourdomain.com/courses" style="background-color: #f78404; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">KHÁM PHÁ KHÓA HỌC</a>
                </div>
                <p>Nếu bạn có bất kỳ câu hỏi nào, hãy liên hệ ngay với chúng tôi nhé!</p>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    },
    {
      name: "Chào mừng & Cảm ơn thanh toán",
      description: "Tự động gửi email khi người dùng mua khóa học thành công",
      event_type: EventType.COURSE_PURCHASED,
      steps: [
        {
          step_order: 1,
          delay_minutes: 0,
          subject_template:
            "[SRM] Chúc mừng bạn đã đăng ký thành công khóa học {{course.title}}",
          body_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #f78404; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SRM Academy</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2>Chúc mừng {{user.name}}!</h2>
                <p>Chúng tôi đã nhận được thanh toán thành công cho khóa học <strong>{{course.title}}</strong>.</p>

                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #f78404; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Chi tiết đơn hàng:</strong></p>
                  <p style="margin: 0;">- Mã giao dịch: {{order.transaction_id}}</p>
                  <p style="margin: 0;">- Sản phẩm: {{course.title}}</p>
                  <p style="margin: 0;">- Số tiền: {{order.amount}} VNĐ</p>
                  <p style="margin: 0;">- Trạng thái: Đã hoàn thành</p>
                </div>

                {{#if temp_password}}
                <div style="background-color: #fff3e0; padding: 15px; border: 1px dashed #f78404; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Thông tin đăng nhập của bạn:</strong></p>
                  <p style="margin: 0;">- Email: <code>{{user.email}}</code></p>
                  <p style="margin: 0;">- Mật khẩu tạm thời: <code>{{temp_password}}</code></p>
                  <p style="margin-top: 10px; font-size: 13px; color: #e65100;">* Lưu ý: Bạn sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên để bảo mật tài khoản.</p>
                </div>
                {{/if}}

                <p>Bạn có thể bắt đầu hành trình học tập của mình ngay bây giờ bằng cách nhấn vào nút bên dưới:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{course.learning_url}}" style="background-color: #f78404; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">HỌC NGAY</a>
                </div>
                <p>Nếu bạn gặp bất kỳ khó khăn nào trong quá trình truy cập, đừng ngần ngại trả lời email này hoặc liên hệ hotline: 0123-456-789.</p>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    },
    {
      name: "Xác nhận mua Sách điện tử",
      description: "Gửi email cung cấp link đọc sách và tài khoản",
      event_type: EventType.BOOK_PURCHASED,
      steps: [
        {
          step_order: 1,
          delay_minutes: 0,
          subject_template: "[SRM Store] Giao dịch mua sách {{book.title}} thành công",
          body_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #2c3e50; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SRM Book Store</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2>Cảm ơn bạn, {{user.name}}!</h2>
                <p>Đơn hàng mua sách điện tử <strong>{{book.title}}</strong> của bạn đã được xác nhận thành công.</p>

                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2c3e50; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Thông tin thanh toán:</strong></p>
                  <p style="margin: 0;">- Mã giao dịch: {{order.transaction_id}}</p>
                  <p style="margin: 0;">- Số tiền: {{order.amount}} VNĐ</p>
                </div>

                {{#if temp_password}}
                <div style="background-color: #e8f4fd; padding: 15px; border: 1px dashed #2980b9; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Tài khoản truy cập kho sách:</strong></p>
                  <p style="margin: 0;">- Email: <code>{{user.email}}</code></p>
                  <p style="margin: 0;">- Mật khẩu: <code>{{temp_password}}</code></p>
                </div>
                {{/if}}

                <p>Bạn có thể đọc sách trực tuyến ngay tại đây:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{book.read_url}}" style="background-color: #2c3e50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">ĐỌC SÁCH NGAY</a>
                </div>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    },
    {
      name: "Kích hoạt Indicator thành công",
      description: "Gửi thông tin hướng dẫn sử dụng Indicator sau khi thuê",
      event_type: EventType.INDICATOR_PURCHASED,
      steps: [
        {
          step_order: 1,
          delay_minutes: 0,
          subject_template: "[SRM Signal] Kích hoạt công cụ {{indicator.name}} thành công",
          body_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #27ae60; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SRM Trading Tools</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2>Chào {{user.name}},</h2>
                <p>Yêu cầu thuê Indicator <strong>{{indicator.name}}</strong> của bạn đã được kích hoạt thành công trên hệ thống.</p>

                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Thông tin dịch vụ:</strong></p>
                  <p style="margin: 0;">- Mã giao dịch: {{order.transaction_id}}</p>
                  <p style="margin: 0;">- Công cụ: {{indicator.name}}</p>
                  <p style="margin: 0;">- Thời hạn: {{order.duration}}</p>
                </div>

                {{#if temp_password}}
                <div style="background-color: #eafaf1; padding: 15px; border: 1px dashed #27ae60; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Tài khoản Trading của bạn:</strong></p>
                  <p style="margin: 0;">- Email: <code>{{user.email}}</code></p>
                  <p style="margin: 0;">- Mật khẩu: <code>{{temp_password}}</code></p>
                </div>
                {{/if}}

                <p>Vui lòng xem hướng dẫn cài đặt tại link dưới đây:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{indicator.guide_url}}" style="background-color: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">XEM HƯỚNG DẪN</a>
                </div>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    },
    {
      name: "Chăm sóc khách hàng chưa mua",
      description:
        "Gửi email nhắc nhở sau 1 ngày nếu khách đăng ký nhưng chưa mua khóa học",
      event_type: EventType.USER_REGISTERED_BUT_NOT_PURCHASED,
      steps: [
        {
          step_order: 1,
          delay_minutes: 1440, // 24 hours
          subject_template:
            "{{user.name}} ơi, khóa học bạn quan tâm vẫn đang chờ bạn!",
          body_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SRM Learning</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2>Chào {{user.name}},</h2>
                <p>Chúng tôi nhận thấy bạn đã đăng ký tài khoản tại SRM được {{daysSinceRegistration}} ngày nhưng chưa bắt đầu khóa học nào.</p>
                <p>Bạn có biết rằng việc bắt đầu sớm sẽ giúp bạn tiết kiệm được rất nhiều thời gian và sớm đạt được mục tiêu sự nghiệp của mình?</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://yourdomain.com/courses" style="background-color: #f78404; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">KHÁM PHÁ KHÓA HỌC</a>
                </div>
                <p><strong>Tại sao nên học cùng SRM?</strong></p>
                <ul>
                  <li>Lộ trình từ cơ bản đến nâng cao.</li>
                  <li>Hỗ trợ 24/7 từ đội ngũ Admin.</li>
                  <li>Chứng nhận sau khi hoàn thành.</li>
                </ul>
                <p>Nếu bạn cần tư vấn thêm về lộ trình phù hợp, hãy nhắn tin ngay cho chúng tôi qua Zalo: 0123-456-789 nhé!</p>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
                <p>Bạn không muốn nhận những email như thế này? <a href="#" style="color: #888;">Hủy đăng ký</a></p>
              </div>
            </div>
          `,
        },
      ],
    },
  ];

  try {
    for (const data of defaults) {
      console.log(`[SEED-EMAIL] Checking automation: ${data.name}`);

      // Check if automation already exists by name
      const existing = await (automationService as any).automationModel.findOne(
        {
          name: data.name,
          is_deleted: false,
        },
      );

      if (existing) {
        console.log(
          `[SEED-EMAIL] Automation "${data.name}" already exists. Skipping.`,
        );
        continue;
      }

      console.log(`[SEED-EMAIL] Creating automation: ${data.name}`);
      const automation = await automationService.createAutomation({
        name: data.name,
        description: data.description,
        event_type: data.event_type,
        created_by: "000000000000000000000000", // System user
      } as any);

      // Force active
      await (automationService as any).automationModel.updateOne(
        { _id: automation._id },
        { is_active: true },
      );

      for (const stepData of data.steps) {
        console.log(
          `[SEED-EMAIL] Adding step ${stepData.step_order} to ${data.name}`,
        );
        await automationService.addStep({
          automation_id: (automation as any)._id.toString(),
          ...stepData,
        });
      }
    }
    console.log("[SEED-EMAIL] Seeding completed successfully!");
  } catch (error) {
    console.error(
      "[SEED-EMAIL] Error seeding email automations:",
      error.message,
    );
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
