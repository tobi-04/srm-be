import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Ip,
  Headers,
} from "@nestjs/common";
import { SessionService } from "./session.service";
import {
  CreateSessionDto,
  UpdateSessionDto,
  TrackPageVisitDto,
} from "./dto/session.dto";

@Controller("sessions")
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Create or get session - PUBLIC endpoint
   */
  @Post()
  async createOrGet(
    @Body() createSessionDto: CreateSessionDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    // Automatically add IP and user agent if not provided
    if (!createSessionDto.ip_address) {
      createSessionDto.ip_address = ip;
    }
    if (!createSessionDto.user_agent) {
      createSessionDto.user_agent = userAgent;
    }

    return this.sessionService.createOrGet(createSessionDto);
  }

  /**
   * Get session by session ID - PUBLIC endpoint
   */
  @Get(":sessionId")
  async findBySessionId(@Param("sessionId") sessionId: string) {
    return this.sessionService.findBySessionId(sessionId);
  }

  /**
   * Track page visit - PUBLIC endpoint
   */
  @Patch(":sessionId/page-visit")
  async trackPageVisit(
    @Param("sessionId") sessionId: string,
    @Body() pageVisitDto: TrackPageVisitDto,
  ) {
    return this.sessionService.trackPageVisit(sessionId, pageVisitDto);
  }

  /**
   * End session - PUBLIC endpoint
   */
  @Patch(":sessionId/end")
  async endSession(
    @Param("sessionId") sessionId: string,
    @Body("total_duration") totalDuration: number,
  ) {
    return this.sessionService.endSession(sessionId, totalDuration);
  }

  /**
   * Link user to session - PUBLIC endpoint (called after user registration)
   */
  @Patch(":sessionId/link-user")
  async linkUserToSession(
    @Param("sessionId") sessionId: string,
    @Body("user_id") userId: string,
  ) {
    return this.sessionService.linkUserToSession(sessionId, userId);
  }
}
