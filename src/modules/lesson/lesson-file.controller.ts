import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LessonFileService } from './lesson-file.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('lesson-files')
@Controller('lesson-files')
export class LessonFileController {
  constructor(private readonly lessonFileService: LessonFileService) {}

  @Post('upload/:lessonId')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload files for a lesson (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadFiles(
    @Param('lessonId') lessonId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.lessonFileService.uploadFiles(lessonId, files);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get all files for a lesson' })
  async getFilesByLesson(@Param('lessonId') lessonId: string) {
    return this.lessonFileService.findByLessonId(lessonId);
  }

  @Delete(':fileId')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (Admin only)' })
  async deleteFile(@Param('fileId') fileId: string) {
    await this.lessonFileService.deleteFile(fileId);
  }

  @Delete(':fileId/hard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a file (Admin only)' })
  async hardDeleteFile(@Param('fileId') fileId: string) {
    await this.lessonFileService.hardDeleteFile(fileId);
  }
}
