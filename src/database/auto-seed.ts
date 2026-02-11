import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { UserRepository } from '../modules/user/user.repository';
import { UserRole } from '../modules/user/entities/user.entity';
import * as bcrypt from 'bcryptjs';

/**
 * Auto seed admin user từ environment variables
 * Chạy tự động khi container start
 * Chỉ tạo nếu chưa tồn tại
 */
async function bootstrap() {
  // Lấy thông tin admin từ ENV
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const userRepository = app.get(UserRepository);

  try {
    console.log(`[AUTO-SEED] Checking admin user: ${adminEmail}...`);

    const adminUser = await userRepository.findByEmail(adminEmail, false);

    if (adminUser) {
      console.log(`[AUTO-SEED] Admin user found: ${adminEmail}`);
      
      // Check if password or name needs update
      const isPasswordMatch = await bcrypt.compare(adminPassword, adminUser.password);
      const isNameMatch = adminUser.name === adminName;

      if (!isPasswordMatch || !isNameMatch) {
        console.log('[AUTO-SEED] Configuration changed. Updating admin account...');
        
        const updateData: any = {};
        if (!isPasswordMatch) {
          console.log('[AUTO-SEED] Updating password...');
          // Note: userService.update handles password hashing
          updateData.password = adminPassword;
        }
        if (!isNameMatch) {
          console.log(`[AUTO-SEED] Updating name: "${adminUser.name}" -> "${adminName}"`);
          updateData.name = adminName;
        }

        await userService.update(adminUser._id.toString(), updateData);
        console.log('[AUTO-SEED] ✅ Admin account updated successfully!');
      } else {
        console.log(`[AUTO-SEED] Admin account is up to date. Skipping.`);
      }
    } else {
      console.log('[AUTO-SEED] Admin user not found. Creating default admin account...');
      await userService.create({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: UserRole.ADMIN,
        is_active: true,
      } as any);
      console.log('[AUTO-SEED] ✅ Admin account created successfully!');
      console.log(`[AUTO-SEED] Email: ${adminEmail}`);
      console.log(`[AUTO-SEED] Password: ${adminPassword}`);
    }

  } catch (error) {
    console.error('[AUTO-SEED] ❌ Error seeding admin account:', error.message);
    // Không throw error để không làm crash container
  } finally {
    await app.close();
  }
}

bootstrap();
