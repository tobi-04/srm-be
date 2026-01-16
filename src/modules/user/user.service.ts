import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { UserRepository } from "./user.repository";
import { CreateUserDto, UpdateUserDto, SearchUserDto } from "./dto/user.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email, false);
  }
}
