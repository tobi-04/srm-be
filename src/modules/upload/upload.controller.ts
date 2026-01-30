import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Param,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { R2Service } from "../../common/storage/r2.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";

@ApiTags("upload")
@Controller("upload")
@UseGuards(JwtAccessGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly r2Service: R2Service) {}

  /**
   * Upload image to R2 storage
   * Supports: books, indicators, courses, users
   */
  @Post(":folder")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (req, file, cb) => {
        // Only allow image files
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)",
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiOperation({ summary: "Upload image to R2 storage" })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Param("folder") folder: string,
  ) {
    if (!file) {
      throw new BadRequestException("Vui lòng chọn file để upload");
    }

    // Validate folder name
    const allowedFolders = [
      "books",
      "indicators",
      "courses",
      "users",
      "covers",
    ];
    if (!allowedFolders.includes(folder)) {
      throw new BadRequestException(
        `Folder không hợp lệ. Chỉ chấp nhận: ${allowedFolders.join(", ")}`,
      );
    }

    const result = await this.r2Service.uploadFile(file, folder);

    return {
      success: true,
      url: result.url,
      key: result.key,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    };
  }
}
