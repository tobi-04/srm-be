import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LessonNote } from "./entities/lesson-note.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class LessonNoteRepository extends BaseRepository<LessonNote> {
  protected readonly modelName = "LessonNote";

  constructor(
    @InjectModel(LessonNote.name) protected readonly model: Model<LessonNote>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }
}
