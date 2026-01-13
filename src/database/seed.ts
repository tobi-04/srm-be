import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { UserRepository } from '../modules/user/user.repository';
import { UserRole } from '../modules/user/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const userRepository = app.get(UserRepository);

  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'admin123';
  const adminName = 'System Admin';

  try {
    console.log(`[SEED] Searching for admin user by email: ${adminEmail}...`);

    // Search for the user by email precisely using Repository
    const adminUser = await userRepository.findByEmail(adminEmail, false);

    if (adminUser) {
      console.log(`[SEED] Admin user found: ID=${(adminUser as any)._id}, active=${(adminUser as any).is_active}, deleted=${(adminUser as any).is_deleted}`);

      console.log('[SEED] Resetting password, ensuring active status and not deleted...');
      await userService.update((adminUser as any)._id.toString(), {
        password: adminPassword,
        is_active: true,
        is_deleted: false,
        role: UserRole.ADMIN,
      } as any);
      console.log('[SEED] Admin account updated successfully!');
    } else {
      console.log('[SEED] Admin user not found. Creating default admin account...');
      await userService.create({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: UserRole.ADMIN,
        is_active: true,
      } as any);
      console.log('[SEED] Admin account created successfully!');
    }

    // Double check
    const doc = await userRepository.findByEmail(adminEmail, false);
    if (doc) {
        console.log(`[SEED] Final check: ID=${(doc as any)._id}, email=${doc.email}, active=${(doc as any).is_active}, deleted=${(doc as any).is_deleted}`);
    } else {
        console.error('[SEED] ERROR: Admin user still not found after update/create!');
    }

  } catch (error) {
    console.error('[SEED] Error seeding admin account:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
