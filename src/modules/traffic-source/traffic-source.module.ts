import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  TrafficSource,
  TrafficSourceSchema,
} from "./entities/traffic-source.entity";
import { TrafficSourceController } from "./traffic-source.controller";
import { TrafficSourceService } from "./traffic-source.service";
import { TrafficSourceRepository } from "./traffic-source.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrafficSource.name, schema: TrafficSourceSchema },
    ]),
  ],
  controllers: [TrafficSourceController],
  providers: [TrafficSourceService, TrafficSourceRepository],
  exports: [TrafficSourceService, TrafficSourceRepository],
})
export class TrafficSourceModule {}
