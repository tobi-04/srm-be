import { Controller, Get, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserBookAccess } from '../book-store/entities/user-book-access.entity';

@Controller('debug')
export class DebugController {
  constructor(
    @InjectModel(UserBookAccess.name)
    private readonly userBookAccessModel: Model<UserBookAccess>,
  ) {}

  @Get('user-books/:userId')
  async getUserBooks(@Param('userId') userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // Query 1: Find with is_deleted filter
    const withFilter = await this.userBookAccessModel.find({
      user_id: userObjectId,
      is_deleted: false,
    });

    // Query 2: Find without is_deleted filter
    const withoutFilter = await this.userBookAccessModel.find({
      user_id: userObjectId,
    });

    // Query 3: Find ALL documents
    const all = await this.userBookAccessModel.find({});

    return {
      userId,
      userObjectId: userObjectId.toString(),
      withFilter: {
        count: withFilter.length,
        data: withFilter,
      },
      withoutFilter: {
        count: withoutFilter.length,
        data: withoutFilter,
      },
      allDocuments: {
        count: all.length,
        data: all.map(d => ({
          _id: d._id,
          user_id: d.user_id,
          book_id: d.book_id,
          is_deleted: d.is_deleted,
        })),
      },
    };
  }
}
