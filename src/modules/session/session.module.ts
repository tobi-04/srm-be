import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Session, SessionSchema } from "./entities/session.entity";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { SessionRepository } from "./session.repository";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
