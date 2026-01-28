import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { R2Module } from "../../common/storage/r2.module";

@Module({
  imports: [R2Module],
  controllers: [UploadController],
})
export class UploadModule {}
