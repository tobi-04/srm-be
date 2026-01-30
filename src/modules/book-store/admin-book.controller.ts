import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { BookStoreService } from "./book-store.service";
import { CreateBookDto, UpdateBookDto, SearchBookDto } from "./dto/book.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { BookFileType } from "./entities/book-file.entity";

@ApiTags("admin-books-new")
@Controller("admin/books")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class AdminBookController {
  constructor(private readonly bookStoreService: BookStoreService) {
    console.log("🚀 [AdminBookController] Re-initialized at /admin/books");
  }

  @Get("health")
  @ApiOperation({ summary: "Health check for admin books" })
  async health() {
    return { status: "up", timestamp: new Date().toISOString() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor("files"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create a new book with optional files" })
  async create(
    @Body() createBookDto: CreateBookDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.bookStoreService.create(createBookDto, files);
  }

  @Get()
  @ApiOperation({ summary: "Get all books (admin view)" })
  async findAll(@Query() paginationDto: PaginationDto) {
    console.log("🔍 [AdminBookController] findAll called with:", paginationDto);
    const searchDto: SearchBookDto = {
      status: paginationDto.status as any,
    };
    return this.bookStoreService.findAll(paginationDto, searchDto, true);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get book by ID" })
  async findOne(@Param("id") id: string) {
    return this.bookStoreService.findOne(id, true);
  }

  @Put(":id")
  @UseInterceptors(FilesInterceptor("files"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Update a book" })
  async update(
    @Param("id") id: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.bookStoreService.update(id, updateBookDto, files);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete a book" })
  async remove(@Param("id") id: string) {
    await this.bookStoreService.remove(id);
  }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        file_type: { type: "string", enum: ["PDF", "EPUB"] },
      },
    },
  })
  @ApiOperation({ summary: "Upload book file" })
  async uploadFile(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("file_type") fileType: BookFileType,
  ) {
    return this.bookStoreService.uploadBookFile(
      id,
      file,
      fileType || BookFileType.PDF,
    );
  }

  @Delete("files/:fileId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete book file" })
  async deleteFile(@Param("fileId") fileId: string) {
    await this.bookStoreService.deleteBookFile(fileId);
  }
}
