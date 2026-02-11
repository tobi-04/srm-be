import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DebugController } from './debug.controller';
import {
  UserBookAccess,
  UserBookAccessSchema,
} from '../book-store/entities/user-book-access.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserBookAccess.name, schema: UserBookAccessSchema },
    ]),
  ],
  controllers: [DebugController],
})
export class DebugModule {}
