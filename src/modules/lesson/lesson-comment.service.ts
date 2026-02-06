import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { LessonCommentRepository } from "./lesson-comment.repository";
import { LessonCommentReactionRepository } from "./lesson-comment-reaction.repository";
import { UserRepository } from "../user/user.repository";
import {
  CreateLessonCommentDto,
  UpdateLessonCommentDto,
  AddReactionDto,
} from "./dto/lesson-comment.dto";
import { Types } from "mongoose";

@Injectable()
export class LessonCommentService {
  constructor(
    private readonly commentRepository: LessonCommentRepository,
    private readonly reactionRepository: LessonCommentReactionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async findAll(lessonId: string, userId?: string) {
    // 1. Fetch comments with joined user data using Aggregation
    const comments = await this.commentRepository.findAllWithUser(lessonId);

    if (comments.length === 0) return [];

    // 2. Reactions & Threading logic
    const commentIds = comments.map((c) => c._id as Types.ObjectId);
    const reactions =
      await this.reactionRepository.countReactionsBulk(commentIds);

    const reactionsMap = new Map();
    reactions.forEach((r) => {
      const commentId = r._id.comment_id.toString();
      if (!reactionsMap.has(commentId)) {
        reactionsMap.set(commentId, {});
      }
      reactionsMap.get(commentId)[r._id.type] = r.count;
    });

    let userReactionsMap = new Map();
    if (userId && commentIds.length > 0) {
      const userReactions =
        await this.reactionRepository.findByUserAndCommentIds(
          userId,
          commentIds,
        );
      userReactions.forEach((ur) => {
        userReactionsMap.set(ur.comment_id.toString(), ur.type);
      });
    }

    // 3. Map final object (Adding reactions to aggregated data)
    const formattedComments = comments.map((c) => {
      const idStr = c._id.toString();

      return {
        ...c,
        reactions: reactionsMap.get(idStr) || {},
        userReaction: userReactionsMap.get(idStr) || null,
      };
    });

    const parentComments = formattedComments.filter((c) => !c.replied_to);
    const childComments = formattedComments.filter((c) => c.replied_to);

    return parentComments.map((parent) => ({
      ...parent,
      replies: childComments.filter(
        (child) => child.replied_to?.toString() === parent._id.toString(),
      ),
    }));
  }

  async create(userId: string, createDto: CreateLessonCommentDto) {
    // Security: Ensure user_id cannot be injected via DTO
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, ...cleanDto } = createDto as any;

    return this.commentRepository.create({
      ...cleanDto,
      user_id: new Types.ObjectId(userId) as any,
      lesson_id: new Types.ObjectId(createDto.lesson_id) as any,
      replied_to: createDto.replied_to
        ? (new Types.ObjectId(createDto.replied_to) as any)
        : null,
    });
  }

  async update(userId: string, id: string, updateDto: UpdateLessonCommentDto) {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.user_id.toString() !== userId)
      throw new ForbiddenException("You can only edit your own comments");

    return this.commentRepository.updateById(id, updateDto);
  }

  async remove(userId: string, id: string, isAdmin = false) {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException("Comment not found");

    if (!isAdmin && comment.user_id.toString() !== userId) {
      throw new ForbiddenException("You can only delete your own comments");
    }

    // Hard delete as requested
    await this.reactionRepository.deleteByCommentId(id);

    // Also delete replies if it's a parent comment
    if (!comment.replied_to) {
      await this.commentRepository.hardDeleteMany({
        replied_to: new Types.ObjectId(id),
      });
    }

    return this.commentRepository.hardDeleteById(id);
  }

  async addReaction(
    userId: string,
    commentId: string,
    reactionDto: AddReactionDto,
  ) {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) throw new NotFoundException("Comment not found");

    return this.reactionRepository.upsertReaction(
      userId,
      commentId,
      reactionDto.type,
    );
  }

  async removeReaction(userId: string, commentId: string) {
    return this.reactionRepository.removeReaction(userId, commentId);
  }
}
