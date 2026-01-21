import { Injectable, NotFoundException } from "@nestjs/common";
import { SessionRepository } from "./session.repository";
import {
  CreateSessionDto,
  UpdateSessionDto,
  TrackPageVisitDto,
} from "./dto/session.dto";

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Create or get existing session
   */
  async createOrGet(createSessionDto: CreateSessionDto) {
    // Check if session already exists
    const existing = await this.sessionRepository.findBySessionId(
      createSessionDto.session_id,
    );

    if (existing) {
      return existing;
    }

    return this.sessionRepository.create({
      ...createSessionDto,
      session_start: new Date(),
      pages_visited: [],
      is_converted: false,
    } as any);
  }

  /**
   * Find session by ID
   */
  async findById(id: string) {
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  /**
   * Find session by session ID
   */
  async findBySessionId(sessionId: string) {
    return this.sessionRepository.findBySessionId(sessionId);
  }

  /**
   * Track page visit
   */
  async trackPageVisit(sessionId: string, pageVisitDto: TrackPageVisitDto) {
    const session = await this.sessionRepository.addPageVisit(
      sessionId,
      pageVisitDto,
    );

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return session;
  }

  /**
   * End session
   */
  async endSession(sessionId: string, totalDuration: number) {
    const session = await this.sessionRepository.endSession(
      sessionId,
      totalDuration,
    );

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return session;
  }

  /**
   * Mark session as converted (user made a purchase)
   */
  async markAsConverted(sessionId: string) {
    const session = await this.sessionRepository.markAsConverted(sessionId);

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return session;
  }

  /**
   * Link user to session after registration
   */
  async linkUserToSession(sessionId: string, userId: string) {
    return this.sessionRepository.linkUserToSession(sessionId, userId);
  }

  /**
   * Get sessions by traffic source ID
   */
  async findByTrafficSourceId(trafficSourceId: string) {
    return this.sessionRepository.findByTrafficSourceId(trafficSourceId);
  }

  /**
   * Get sessions by user ID
   */
  async findByUserId(userId: string) {
    return this.sessionRepository.findByUserId(userId);
  }

  /**
   * Update session
   */
  async update(id: string, updateSessionDto: UpdateSessionDto) {
    const session = await this.sessionRepository.updateById(
      id,
      updateSessionDto,
    );

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return session;
  }
}
