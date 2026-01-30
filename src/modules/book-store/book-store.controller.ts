import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
  Delete,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { BookStoreService } from "./book-store.service";
import { BookOrderService } from "./book-order.service";
import { SearchBookDto } from "./dto/book.dto";
import { CreateBookOrderDto } from "./dto/book-order.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

@ApiTags("books")
@Controller("books")
export class BookStoreController {
  constructor(
    private readonly bookStoreService: BookStoreService,
    private readonly bookOrderService: BookOrderService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get all active books with pagination" })
  async findAll(@Query() paginationDto: PaginationDto, @Request() req: any) {
    const searchDto: SearchBookDto = {
      status: paginationDto.status as any,
    };
    const isAdmin = req.user?.role === "admin";
    return this.bookStoreService.findAll(paginationDto, searchDto, isAdmin);
  }

  @Get("my-books")
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get books owned by current user" })
  async getMyBooks(@Request() req: any) {
    return this.bookStoreService.getMyBooks(req.user.sub || req.user._id);
  }

  @Get(":slug")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get book by slug" })
  async findBySlug(@Param("slug") slug: string, @Request() req: any) {
    const isAdmin = req.user?.role === "admin";
    return this.bookStoreService.findBySlug(slug, isAdmin);
  }

  @Post("checkout")
  @ApiOperation({ summary: "Process book checkout and generate QR code" })
  async checkout(@Body() createBookOrderDto: CreateBookOrderDto) {
    return this.bookOrderService.checkout(createBookOrderDto);
  }

  @Get("order-status/:id")
  @ApiOperation({ summary: "Check book order status" })
  async getOrderStatus(@Param("id") id: string) {
    return this.bookOrderService.getOrderStatus(id);
  }

  @Delete("order/:id")
  @ApiOperation({ summary: "Cancel a pending book order" })
  async cancelOrder(@Param("id") id: string) {
    return this.bookOrderService.cancelOrder(id);
  }

  @Get(":id/download/:fileId")
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get secure download URL for a book file" })
  async download(
    @Param("id") bookId: string,
    @Param("fileId") fileId: string,
    @Request() req: any,
  ) {
    return this.bookStoreService.getDownloadUrl(
      req.user.sub || req.user._id,
      bookId,
      fileId,
    );
  }
}
