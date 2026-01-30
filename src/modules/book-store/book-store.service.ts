import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BookStoreRepository } from "./book-store.repository";
import { CreateBookDto, UpdateBookDto, SearchBookDto } from "./dto/book.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { Book, BookStatus } from "./entities/book.entity";
import { BookFile, BookFileType } from "./entities/book-file.entity";
import { UserBookAccess } from "./entities/user-book-access.entity";
import { R2Service } from "../../common/storage/r2.service";

@Injectable()
export class BookStoreService {
  constructor(
    private readonly bookRepository: BookStoreRepository,
    @InjectModel(BookFile.name)
    private readonly bookFileModel: Model<BookFile>,
    @InjectModel(UserBookAccess.name)
    private readonly userBookAccessModel: Model<UserBookAccess>,
    private readonly r2Service: R2Service,
  ) {}

  /**
   * Generate unique slug from title
   */
  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .trim() +
      "-" +
      Date.now()
    );
  }

  async create(createBookDto: CreateBookDto, files?: Express.Multer.File[]) {
    const slug = this.generateSlug(createBookDto.title);
    const book = await this.bookRepository.create({
      ...createBookDto,
      slug,
      price: Number(createBookDto.price), // Ensure price is a number for multipart
      discount_percentage: Number(createBookDto.discount_percentage || 0),
    } as any);

    // If there are files, upload them
    if (files && files.length > 0) {
      for (const file of files) {
        // Detect file type from name or mimetype
        const fileType = file.originalname.toLowerCase().endsWith(".epub")
          ? BookFileType.EPUB
          : BookFileType.PDF;

        await this.uploadBookFile((book as any)._id.toString(), file, fileType);
      }
    }

    // Xóa cache danh sách sách sau khi tạo mới
    await this.bookRepository.invalidateCache();
    return book;
  }

  async findAll(
    paginationDto: PaginationDto,
    searchDto: SearchBookDto,
    isAdmin: boolean = false,
  ) {
    const { page, limit, sort, order, search } = paginationDto;
    const { status } = searchDto;

    const filter: any = {};

    if (!isAdmin) {
      filter.status = BookStatus.ACTIVE;
    } else if (status) {
      filter.status = status;
    }

    return this.bookRepository.paginate(filter, {
      page,
      limit,
      sort: sort || "created_at",
      order,
      search,
      searchFields: ["title", "description"],
      useCache: true,
      cacheTTL: 600,
      includeDeleted: false, // Ensure even admins don't see soft-deleted books in regular list
    });
  }

  async findOne(id: string, isAdmin: boolean = false) {
    const book = await this.bookRepository.findById(id);

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    if (!isAdmin && book.status === BookStatus.DRAFT) {
      throw new NotFoundException("Book not found");
    }

    // Get files associated with the book
    const files = await this.bookFileModel.find({
      book_id: new Types.ObjectId(id),
      is_deleted: false,
    });

    return {
      ...(book as any).toObject(),
      files,
    };
  }

  async findBySlug(slug: string, isAdmin: boolean = false) {
    const book = await this.bookRepository.findBySlug(slug);

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    if (!isAdmin && book.status === BookStatus.DRAFT) {
      throw new NotFoundException("Book not found");
    }

    const files = await this.bookFileModel.find({
      book_id: (book as any)._id,
      is_deleted: false,
    });

    return {
      ...(book as any).toObject(),
      files,
    };
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    files?: Express.Multer.File[],
  ) {
    const existingBook = await this.bookRepository.findById(id);
    if (!existingBook) {
      throw new NotFoundException("Book not found");
    }

    const updateData: any = { ...updateBookDto };
    if (updateBookDto.title && updateBookDto.title !== existingBook.title) {
      updateData.slug = this.generateSlug(updateBookDto.title);
    }

    // Handle price and discount conversion for multipart
    if (updateBookDto.price !== undefined) {
      updateData.price = Number(updateBookDto.price);
    }
    if (updateBookDto.discount_percentage !== undefined) {
      updateData.discount_percentage = Number(
        updateBookDto.discount_percentage,
      );
    }

    const book = await this.bookRepository.updateById(id, updateData);
    if (!book) {
      throw new NotFoundException("Book not found");
    }

    // If there are files, upload them
    if (files && files.length > 0) {
      for (const file of files) {
        const fileType = file.originalname.toLowerCase().endsWith(".epub")
          ? BookFileType.EPUB
          : BookFileType.PDF;

        await this.bookFileModel.create({
          book_id: book._id,
          file_path: file.path,
          file_type: fileType,
          file_size: file.size,
        });
      }
    }

    // Xóa cache sau khi cập nhật
    await this.bookRepository.invalidateCache();
    await this.bookRepository.invalidateCacheById(id);

    return book;
  }

  async remove(id: string) {
    const book = await this.bookRepository.deleteById(id);
    if (!book) {
      throw new NotFoundException("Book not found");
    }

    // Xóa cache sau khi xóa sách
    await this.bookRepository.invalidateCache();
    await this.bookRepository.invalidateCacheById(id);

    return { message: "Book deleted successfully" };
  }

  /**
   * Handle Book File Upload
   */
  async uploadBookFile(
    bookId: string,
    file: Express.Multer.File,
    fileType: BookFileType,
  ) {
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      throw new NotFoundException("Book not found");
    }

    // Upload to R2 in 'books' folder
    const { key } = await this.r2Service.uploadFile(file, "books");

    const bookFile = new this.bookFileModel({
      book_id: new Types.ObjectId(bookId),
      file_path: key,
      file_type: fileType,
      file_size: file.size,
    });

    const result = await bookFile.save();

    // Invalidate book cache to reflect new files in findOne/findBySlug
    await this.bookRepository.invalidateCacheById(bookId);

    return result;
  }

  /**
   * Delete Book File
   */
  async deleteBookFile(fileId: string) {
    const file = await this.bookFileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException("File not found");
    }

    // Delete from R2
    await this.r2Service.deleteFile(file.file_path);

    // Soft delete in DB
    file.is_deleted = true;
    file.updated_at = new Date();
    const result = await file.save();

    // Invalidate book cache
    await this.bookRepository.invalidateCacheById(file.book_id.toString());

    return result;
  }

  /**
   * Get books owned by user
   */
  async getMyBooks(userId: string) {
    const accesses = await this.userBookAccessModel
      .find({
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      })
      .sort({ granted_at: -1 });

    const result = [];
    for (const access of accesses) {
      const book = await this.bookRepository.findById(
        access.book_id.toString(),
      );
      if (!book) continue;

      const files = await this.bookFileModel.find({
        book_id: access.book_id,
        is_deleted: false,
      });

      result.push({
        _id: access._id,
        granted_at: access.granted_at,
        book,
        files,
      });
    }
    return result;
  }

  /**
   * Check if user has access to a book
   */
  async checkAccess(userId: string, bookId: string): Promise<boolean> {
    const access = await this.userBookAccessModel.findOne({
      user_id: new Types.ObjectId(userId),
      book_id: new Types.ObjectId(bookId),
      is_deleted: false,
    });
    return !!access;
  }

  /**
   * Grant access to user
   */
  async grantAccess(userId: string, bookId: string) {
    const existing = await this.userBookAccessModel.findOne({
      user_id: new Types.ObjectId(userId),
      book_id: new Types.ObjectId(bookId),
    });

    if (existing) {
      if (existing.is_deleted) {
        existing.is_deleted = false;
        existing.granted_at = new Date();
        return existing.save();
      }
      return existing;
    }

    const access = new this.userBookAccessModel({
      user_id: new Types.ObjectId(userId),
      book_id: new Types.ObjectId(bookId),
      granted_at: new Date(),
    });

    return access.save();
  }

  /**
   * Download Book File
   */
  async getDownloadUrl(userId: string, bookId: string, fileId: string) {
    const hasAccess = await this.checkAccess(userId, bookId);
    if (!hasAccess) {
      throw new BadRequestException("You do not have access to this book");
    }

    const file = await this.bookFileModel.findOne({
      _id: new Types.ObjectId(fileId),
      book_id: new Types.ObjectId(bookId),
      is_deleted: false,
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    // Get presigned URL from R2 (valid for 1 hour)
    return this.r2Service.getPresignedUrl(file.file_path, 3600);
  }
}
