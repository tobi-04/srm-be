import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserRepository } from "./user.repository";
import { CreateUserDto, UpdateUserDto, SearchUserDto } from "./dto/user.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { User, UserRole } from "./entities/user.entity";
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
} from "../course-enrollment/entities/course-enrollment.entity";
import { SalerDetailsService } from "../saler-details/saler-details.service";
import { RedisCacheService } from "../../common/cache/redis-cache.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CourseEnrollment.name)
    private readonly enrollmentModel: Model<CourseEnrollmentDocument>,
    private readonly salerDetailsService: SalerDetailsService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
      false,
    );

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    } as any);

    const { password, ...result } = (user as any).toObject();
    return result;
  }

  async createMany(createUserDtos: CreateUserDto[]) {
    const usersWithHashedPasswords = await Promise.all(
      createUserDtos.map(async (dto) => ({
        ...dto,
        password: await bcrypt.hash(dto.password, 10),
      })),
    );

    const users = await this.userRepository.createMany(
      usersWithHashedPasswords as any,
    );

    return users.map((user) => {
      const { password, ...result } = (user as any).toObject();
      return result;
    });
  }

  async findAll(paginationDto: PaginationDto, searchDto: SearchUserDto) {
    const { page, limit, sort, order, search } = paginationDto;
    const { role, is_active } = searchDto;

    const filter: any = {};
    if (role) filter.role = role;
    if (is_active !== undefined) filter.is_active = is_active;

    const result = await this.userRepository.paginate(filter, {
      page,
      limit,
      sort: sort || "created_at",
      order,
      search,
      searchFields: ["name", "email"],
      select: ["-password"],
      useCache: true,
      cacheTTL: 300,
    });

    return result;
  }

  /**
   * Find students (role: user) with enrollment status
   * Uses aggregation pipeline for optimal performance
   */
  async findStudents(paginationDto: PaginationDto) {
    const { page = 1, limit = 20, search } = paginationDto;
    const skip = (page - 1) * limit;

    const matchStage: any = {
      role: UserRole.USER,
      is_deleted: false,
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "course_enrollments",
          localField: "_id",
          foreignField: "user_id",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          has_enrollment: { $gt: [{ $size: "$enrollments" }, 0] },
        },
      },
      {
        $project: {
          password: 0,
          enrollments: 0,
        },
      },
      { $sort: { created_at: -1 as const } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.userModel.aggregate(pipeline);

    const data = result?.data || [];
    const total = result?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Find salers (role: sale) with their details
   */
  async findSalers(paginationDto: PaginationDto) {
    const { page = 1, limit = 20, search } = paginationDto;
    const skip = (page - 1) * limit;

    const matchStage: any = {
      role: UserRole.SALE,
      is_deleted: false,
    };

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "saler_details",
          localField: "_id",
          foreignField: "user_id",
          as: "saler_details",
        },
      },
      {
        $unwind: {
          path: "$saler_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          code_saler: "$saler_details.code_saler",
          kpi_monthly_target: "$saler_details.kpi_monthly_target",
          kpi_quarterly_target: "$saler_details.kpi_quarterly_target",
          kpi_yearly_target: "$saler_details.kpi_yearly_target",
        },
      },
      {
        $project: {
          password: 0,
          saler_details: 0,
        },
      },
      { $sort: { created_at: -1 as const } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.userModel.aggregate(pipeline);

    const data = result?.data || [];
    const total = result?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get student details with courses, progress, and order history
   * Optimized with single aggregation pipeline - O(1) complexity
   * Uses caching for better performance
   */
  async getStudentDetails(userId: string) {
    const cacheKey = this.cacheService.generateKey("student-details", userId);

    // Try to get from cache first
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("Student not found");
    }

    if (user.role !== UserRole.USER) {
      throw new NotFoundException("User is not a student");
    }

    // Use aggregation pipeline for optimal performance - single query
    const pipeline: any[] = [
      { $match: { _id: user._id } },
      // Lookup enrollments
      {
        $lookup: {
          from: "course_enrollments",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$userId"] },
                is_deleted: false,
              },
            },
            // Join with courses
            {
              $lookup: {
                from: "courses",
                localField: "course_id",
                foreignField: "_id",
                as: "course",
              },
            },
            {
              $unwind: {
                path: "$course",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                course_id: "$course._id",
                course_title: "$course.title",
                enrolled_at: 1,
                status: 1,
                progress_percent: 1,
                completed_lessons_count: 1,
                last_activity_at: 1,
              },
            },
          ],
          as: "enrollments",
        },
      },
      // Lookup orders via UserFormSubmission and PaymentTransaction
      {
        $lookup: {
          from: "user_form_submissions",
          let: { userEmail: "$email" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$email", "$$userEmail"] },
                is_deleted: false,
              },
            },
            // Join with PaymentTransaction
            {
              $lookup: {
                from: "payment_transactions",
                localField: "_id",
                foreignField: "user_form_submission_id",
                pipeline: [
                  {
                    $match: {
                      is_deleted: false,
                    },
                  },
                  // Join with Course to get title
                  {
                    $lookup: {
                      from: "courses",
                      localField: "course_id",
                      foreignField: "_id",
                      as: "course",
                    },
                  },
                  {
                    $unwind: {
                      path: "$course",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      order_id: "$_id",
                      course_title: "$course.title",
                      amount: 1,
                      status: 1,
                      paid_at: 1,
                      created_at: 1,
                    },
                  },
                ],
                as: "transactions",
              },
            },
            { $unwind: "$transactions" },
            { $replaceRoot: { newRoot: "$transactions" } },
            { $sort: { created_at: -1 } },
          ],
          as: "orders",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          is_active: 1,
          created_at: 1,
          enrollments: 1,
          orders: 1,
        },
      },
    ];

    const [result] = await this.userModel.aggregate(pipeline);

    if (!result) {
      throw new NotFoundException("Student not found");
    }

    const response = {
      student: {
        _id: result._id,
        name: result.name,
        email: result.email,
        is_active: result.is_active,
        created_at: result.created_at,
      },
      enrollments: result.enrollments || [],
      orders: result.orders || [],
      summary: {
        total_courses: result.enrollments?.length || 0,
        total_orders: result.orders?.length || 0,
        avg_progress:
          result.enrollments?.length > 0
            ? Math.round(
                result.enrollments.reduce(
                  (sum: number, e: any) => sum + (e.progress_percent || 0),
                  0,
                ) / result.enrollments.length,
              )
            : 0,
        total_spent:
          result.orders
            ?.filter((o: any) => o.status === "completed")
            .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0,
      },
    };

    // Cache the result for 5 minutes (300 seconds)
    await this.cacheService.set(cacheKey, response, 300);

    return response;
  }

  /**
   * Clear student details cache
   * Called after CUD operations that affect student data
   */
  async clearStudentDetailsCache(userId: string) {
    const cacheKey = this.cacheService.generateKey("student-details", userId);
    await this.cacheService.del(cacheKey);
  }

  /**
   * Create a new saler account with must_change_password = true
   * Also creates saler_details with unique code_saler
   */
  async createSaler(dto: { email: string; password: string; name: string }) {
    const existingUser = await this.userRepository.findByEmail(
      dto.email,
      false,
    );

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepository.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      role: UserRole.SALE,
      must_change_password: true,
      is_active: true,
    } as any);

    // Create saler details with unique code_saler
    const salerDetails = await this.salerDetailsService.createForSaler(
      (user as any)._id.toString(),
    );

    const { password, ...userResult } = (user as any).toObject();

    return {
      ...userResult,
      code_saler: salerDetails.code_saler,
    };
  }

  async search(query: string, paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    return this.userRepository.searchUsers(query, page, limit);
  }

  async findOne(id: string) {
    const user = await this.userRepository.findById(id, {
      select: ["-password"],
      useCache: true,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userRepository.updateById(id, updateUserDto as any);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Clear cache for student details
    await this.clearStudentDetailsCache(id);

    const { password, ...result } = (user as any).toObject();
    return result;
  }

  async remove(id: string) {
    const user = await this.userRepository.deleteById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Clear cache for student details
    await this.clearStudentDetailsCache(id);

    return { message: "User deleted successfully" };
  }

  async removeMany(ids: string[]) {
    const deletePromises = ids.map((id) => this.userRepository.deleteById(id));
    await Promise.all(deletePromises);

    // Clear cache for all affected students
    await Promise.all(ids.map((id) => this.clearStudentDetailsCache(id)));

    return { message: `${ids.length} users deleted successfully` };
  }

  async restore(id: string) {
    const user = await this.userRepository.restore(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Clear cache for student details
    await this.clearStudentDetailsCache(id);

    const { password, ...result } = (user as any).toObject();
    return result;
  }

  /**
   * Toggle user active status (lock/unlock)
   */
  async toggleActive(id: string) {
    const user = await this.userModel.findOne({ _id: id, is_deleted: false });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.userRepository.updateById(id, {
      is_active: !user.is_active,
    } as any);

    // Clear cache for student details
    await this.clearStudentDetailsCache(id);

    const { password, ...result } = (updated as any).toObject();
    return result;
  }

  /**
   * Toggle active status for multiple users
   */
  async toggleActiveMany(ids: string[], setActive: boolean) {
    const result = await this.userModel.updateMany(
      { _id: { $in: ids }, is_deleted: false },
      { is_active: setActive, updated_at: new Date() },
    );

    // Clear cache for all affected students
    await Promise.all(ids.map((id) => this.clearStudentDetailsCache(id)));

    // Invalidate cache
    await this.userRepository["invalidateCache"]();

    return {
      message: `${result.modifiedCount} users ${
        setActive ? "unlocked" : "locked"
      } successfully`,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Hard delete a single user (permanent)
   */
  async hardDelete(id: string) {
    const user = await this.userRepository.hardDeleteById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Clear cache for student details
    await this.clearStudentDetailsCache(id);

    return { message: "User permanently deleted" };
  }

  /**
   * Hard delete multiple users (permanent)
   */
  async hardDeleteMany(ids: string[]) {
    const result = await this.userModel.deleteMany({ _id: { $in: ids } });

    // Clear cache for all affected students
    await Promise.all(ids.map((id) => this.clearStudentDetailsCache(id)));

    // Invalidate cache
    await this.userRepository["invalidateCache"]();
    await this.userRepository["invalidateCache"]();

    return {
      message: `${result.deletedCount} users permanently deleted`,
      deletedCount: result.deletedCount,
    };
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email, false);
  }
}
