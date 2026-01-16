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
import * as bcrypt from "bcryptjs";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CourseEnrollment.name)
    private readonly enrollmentModel: Model<CourseEnrollmentDocument>
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
      false
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
      }))
    );

    const users = await this.userRepository.createMany(
      usersWithHashedPasswords as any
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
   * Find salers (role: sale)
   */
  async findSalers(paginationDto: PaginationDto) {
    const { page, limit, sort, order, search } = paginationDto;

    return this.userRepository.paginate({ role: UserRole.SALE } as any, {
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
  }

  /**
   * Create a new saler account with must_change_password = true
   */
  async createSaler(dto: { email: string; password: string; name: string }) {
    const existingUser = await this.userRepository.findByEmail(
      dto.email,
      false
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

    const { password, ...result } = (user as any).toObject();
    return result;
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

    const { password, ...result } = (user as any).toObject();
    return result;
  }

  async remove(id: string) {
    const user = await this.userRepository.deleteById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { message: "User deleted successfully" };
  }

  async removeMany(ids: string[]) {
    const deletePromises = ids.map((id) => this.userRepository.deleteById(id));
    await Promise.all(deletePromises);
    return { message: `${ids.length} users deleted successfully` };
  }

  async restore(id: string) {
    const user = await this.userRepository.restore(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

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

    const { password, ...result } = (updated as any).toObject();
    return result;
  }

  /**
   * Toggle active status for multiple users
   */
  async toggleActiveMany(ids: string[], setActive: boolean) {
    const result = await this.userModel.updateMany(
      { _id: { $in: ids }, is_deleted: false },
      { is_active: setActive, updated_at: new Date() }
    );

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

    return { message: "User permanently deleted" };
  }

  /**
   * Hard delete multiple users (permanent)
   */
  async hardDeleteMany(ids: string[]) {
    const result = await this.userModel.deleteMany({ _id: { $in: ids } });

    // Invalidate cache
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
