import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LessonFile } from '../lesson/entities/lesson-file.entity';
import { R2Service } from '../../common/storage/r2.service';

@Injectable()
export class LessonFileService {
  constructor(
    @InjectModel(LessonFile.name) private lessonFileModel: Model<LessonFile>,
    private r2Service: R2Service,
  ) {}

  async uploadFiles(
    lessonId: string,
    files: Express.Multer.File[],
  ): Promise<LessonFile[]> {
    const uploadedFiles = await this.r2Service.uploadFiles(files, `lessons/${lessonId}`);

    const lessonFiles = uploadedFiles.map((file) => ({
      lesson_id: new Types.ObjectId(lessonId),
      name: file.name,
      url: file.url,
      mime: file.mime,
      size: file.size,
    }));

    return this.lessonFileModel.insertMany(lessonFiles) as any;
  }

  async findByLessonId(lessonId: string): Promise<LessonFile[]> {
    return this.lessonFileModel
      .find({ lesson_id: lessonId, is_deleted: false })
      .sort({ created_at: -1 })
      .exec();
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.lessonFileModel.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Extract key from URL and delete from R2
    try {
      const key = this.r2Service.extractKeyFromUrl(file.url);
      await this.r2Service.deleteFile(key);
    } catch (error) {
      console.error('Failed to delete file from R2:', error);
      // Continue with DB deletion even if R2 fails (e.g. file already gone)
    }

    // Soft delete in database
    await this.lessonFileModel.findByIdAndUpdate(fileId, { is_deleted: true });
  }

  async hardDeleteFile(fileId: string): Promise<void> {
    const file = await this.lessonFileModel.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Extract key from URL and delete from R2
    try {
      const key = this.r2Service.extractKeyFromUrl(file.url);
      await this.r2Service.deleteFile(key);
    } catch (error) {
      console.error('Failed to delete file from R2:', error);
    }

    // Hard delete from database
    await this.lessonFileModel.findByIdAndDelete(fileId);
  }

  async deleteByLessonId(lessonId: string): Promise<void> {
    const files = await this.lessonFileModel.find({ lesson_id: lessonId });
    for (const file of files) {
      try {
        const key = this.r2Service.extractKeyFromUrl(file.url);
        await this.r2Service.deleteFile(key);
      } catch (error) {
        console.error(`Failed to delete file ${file.url} from R2:`, error);
      }
    }
    await this.lessonFileModel.deleteMany({ lesson_id: lessonId });
  }

  async deleteByLessonIds(lessonIds: string[]): Promise<void> {
    const files = await this.lessonFileModel.find({
      lesson_id: { $in: lessonIds.map((id) => new Types.ObjectId(id)) },
    });
    for (const file of files) {
      try {
        const key = this.r2Service.extractKeyFromUrl(file.url);
        await this.r2Service.deleteFile(key);
      } catch (error) {
        console.error(`Failed to delete file ${file.url} from R2:`, error);
      }
    }
    await this.lessonFileModel.deleteMany({
      lesson_id: { $in: lessonIds.map((id) => new Types.ObjectId(id)) },
    });
  }
}
