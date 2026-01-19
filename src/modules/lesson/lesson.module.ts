import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LessonController } from "./lesson.controller";
import { LessonFileController } from "./lesson-file.controller";
import { LessonService } from "./lesson.service";
import { LessonFileService } from "./lesson-file.service";
import { LessonProgressService } from "./lesson-progress.service";
import { LessonRepository } from "./lesson.repository";
import { Lesson, LessonSchema } from "./entities/lesson.entity";
import { LessonFile, LessonFileSchema } from "./entities/lesson-file.entity";
import {
  LessonComment,
  LessonCommentSchema,
} from "./entities/lesson-comment.entity";
import {
  LessonCommentReaction,
  LessonCommentReactionSchema,
} from "./entities/lesson-comment-reaction.entity";
import { LessonNote, LessonNoteSchema } from "./entities/lesson-note.entity";
import {
  LessonProgress,
  LessonProgressSchema,
} from "./entities/lesson-progress.entity";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";
import { R2Module } from "../../common/storage/r2.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lesson.name, schema: LessonSchema },
      { name: LessonFile.name, schema: LessonFileSchema },
      { name: LessonComment.name, schema: LessonCommentSchema },
      { name: LessonCommentReaction.name, schema: LessonCommentReactionSchema },
      { name: LessonNote.name, schema: LessonNoteSchema },
      { name: LessonProgress.name, schema: LessonProgressSchema },
    ]),
    RedisCacheModule,
    R2Module,
  ],
  controllers: [LessonController, LessonFileController],
  providers: [
    LessonService,
    LessonFileService,
    LessonProgressService,
    LessonRepository,
  ],
  exports: [
    LessonService,
    LessonFileService,
    LessonProgressService,
    LessonRepository,
  ],
})
export class LessonModule {}
