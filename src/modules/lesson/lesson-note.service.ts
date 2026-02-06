import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { LessonNoteRepository } from "./lesson-note.repository";
import {
  CreateLessonNoteDto,
  UpdateLessonNoteDto,
} from "./dto/lesson-note.dto";
import { Types } from "mongoose";

@Injectable()
export class LessonNoteService {
  constructor(private readonly noteRepository: LessonNoteRepository) {}

  async findAll(userId: string, lessonId: string) {
    return this.noteRepository.findAll(
      {
        user_id: new Types.ObjectId(userId),
        lesson_id: new Types.ObjectId(lessonId),
      },
      {
        sort: "created_at",
        order: "desc",
        populate: ["user_id"],
      },
    );
  }

  async create(userId: string, createDto: CreateLessonNoteDto) {
    const result = await this.noteRepository.create({
      ...createDto,
      user_id: new Types.ObjectId(userId) as any,
      lesson_id: new Types.ObjectId(createDto.lesson_id) as any,
    });

    // Invalidate course student cache to reflect changes immediately if it's cached there
    // Though notes shouldn't be in course student cache.
    // Just ensure the findAll cache is cleared. BaseRepository.create calls invalidateCache.
    return result;
  }

  async update(userId: string, id: string, updateDto: UpdateLessonNoteDto) {
    const note = await this.noteRepository.findById(id);
    if (!note) throw new NotFoundException("Note not found");
    if (note.user_id.toString() !== userId)
      throw new ForbiddenException("You can only access your own notes");

    return this.noteRepository.updateById(id, updateDto);
  }

  async remove(userId: string, id: string) {
    const note = await this.noteRepository.findById(id);
    if (!note) throw new NotFoundException("Note not found");
    if (note.user_id.toString() !== userId)
      throw new ForbiddenException("You can only access your own notes");

    return this.noteRepository.hardDeleteById(id);
  }
}
