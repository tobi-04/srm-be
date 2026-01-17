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
                  <a href="https://yourdomain.com/dashboard" style="background-color: #f78404; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">HỌC NGAY</a>
                </div>
                <p>Nếu bạn gặp bất kỳ khó khăn nào trong quá trình truy cập, đừng ngần ngại trả lời email này hoặc liên hệ hotline: 0123-456-789.</p>
                <p>Chúc bạn có những trải nghiệm học tập tuyệt vời!</p>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                <p>© 2026 SRM Academy. All rights reserved.</p>
                <p>Địa chỉ: 123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh</p>
                <p>Bạn nhận được email này vì đã đăng ký khóa học tại SRM.</p>
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

      // Check if automation already exists by name and event type
      const existing = await (automationService as any).automationModel.findOne(
        {
          name: data.name,
          event_type: data.event_type,
          is_deleted: false,
        }
      );

      let automation;
      if (!existing) {
        console.log(`[SEED-EMAIL] Creating automation: ${data.name}`);
        automation = await automationService.createAutomation({
          name: data.name,
          description: data.description,
          event_type: data.event_type,
          created_by: "000000000000000000000000", // System user
        } as any);
        // Force active
        await (automationService as any).automationModel.updateOne(
          { _id: automation._id },
          { is_active: true }
        );
      } else {
        console.log(
          `[SEED-EMAIL] Automation ${data.name} already exists. Updating steps.`
        );
        automation = existing;
        // Optionally update description if it changed
        await (automationService as any).automationModel.updateOne(
          { _id: automation._id },
          { description: data.description, is_active: true }
        );
        // Clear existing steps for this automation
        await (automationService as any).stepModel.deleteMany({
          automation_id: automation._id,
        });
      }

      for (const stepData of data.steps) {
        console.log(
          `[SEED-EMAIL] Adding step ${stepData.step_order} to ${data.name}`
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
      error.message
    );
  } finally {
    await app.close();
  }
}

bootstrap();
