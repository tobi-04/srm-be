import { Injectable, NotFoundException } from "@nestjs/common";
import { TrafficSourceRepository } from "./traffic-source.repository";
import {
  CreateTrafficSourceDto,
  TrafficSourceAnalyticsQueryDto,
} from "./dto/traffic-source.dto";

@Injectable()
export class TrafficSourceService {
  constructor(
    private readonly trafficSourceRepository: TrafficSourceRepository,
  ) {}

  /**
   * Create a new traffic source record
   */
  async create(createTrafficSourceDto: CreateTrafficSourceDto) {
    // Check if traffic source with this session_id already exists
    const existing = await this.trafficSourceRepository.findBySessionId(
      createTrafficSourceDto.session_id,
      createTrafficSourceDto.landing_page,
    );

    if (existing) {
      // If UTM source is provided, update the existing record (Last Touch within this context)
      if (createTrafficSourceDto.utm_source) {
        return this.trafficSourceRepository.updateById(
          existing._id.toString(),
          {
            utm_source: createTrafficSourceDto.utm_source,
            utm_medium: createTrafficSourceDto.utm_medium,
            utm_campaign: createTrafficSourceDto.utm_campaign,
            utm_content: createTrafficSourceDto.utm_content,
            utm_term: createTrafficSourceDto.utm_term,
            referrer: createTrafficSourceDto.referrer,
          },
        );
      }
      return existing;
    }

    // Set default utm_source if not provided
    if (!createTrafficSourceDto.utm_source) {
      createTrafficSourceDto.utm_source = this.detectSourceFromReferrer(
        createTrafficSourceDto.referrer,
      );
    }

    return this.trafficSourceRepository.create({
      ...createTrafficSourceDto,
      first_visit_at: createTrafficSourceDto.first_visit_at
        ? new Date(createTrafficSourceDto.first_visit_at)
        : new Date(),
    } as any);
  }

  /**
   * Detect UTM source from referrer URL
   */
  private detectSourceFromReferrer(referrer?: string): string {
    if (!referrer) return "direct";

    const referrerLower = referrer.toLowerCase();

    if (
      referrerLower.includes("facebook.com") ||
      referrerLower.includes("fb.com")
    ) {
      return "facebook";
    }
    if (
      referrerLower.includes("google.com") ||
      referrerLower.includes("google.")
    ) {
      return "google";
    }
    if (
      referrerLower.includes("youtube.com") ||
      referrerLower.includes("youtu.be")
    ) {
      return "youtube";
    }
    if (referrerLower.includes("tiktok.com")) {
      return "tiktok";
    }
    if (referrerLower.includes("instagram.com")) {
      return "instagram";
    }
    if (
      referrerLower.includes("twitter.com") ||
      referrerLower.includes("x.com")
    ) {
      return "twitter";
    }

    return "referral";
  }

  /**
   * Find traffic source by ID
   */
  async findById(id: string) {
    const trafficSource = await this.trafficSourceRepository.findById(id);
    if (!trafficSource) {
      throw new NotFoundException("Traffic source not found");
    }
    return trafficSource;
  }

  /**
   * Find traffic source by session ID
   */
  async findBySessionId(sessionId: string) {
    return this.trafficSourceRepository.findBySessionId(sessionId);
  }

  /**
   * Get analytics by source
   */
  async getAnalyticsBySource(query: TrafficSourceAnalyticsQueryDto) {
    const startDate = query.start_date ? new Date(query.start_date) : undefined;
    const endDate = query.end_date ? new Date(query.end_date) : undefined;

    return this.trafficSourceRepository.getAnalyticsBySource(
      startDate,
      endDate,
    );
  }

  /**
   * Get analytics by campaign
   */
  async getAnalyticsByCampaign(query: TrafficSourceAnalyticsQueryDto) {
    const startDate = query.start_date ? new Date(query.start_date) : undefined;
    const endDate = query.end_date ? new Date(query.end_date) : undefined;

    return this.trafficSourceRepository.getAnalyticsByCampaign(
      startDate,
      endDate,
    );
  }

  /**
   * Get funnel statistics
   */
  async getFunnelStats(query: TrafficSourceAnalyticsQueryDto) {
    const startDate = query.start_date ? new Date(query.start_date) : undefined;
    const endDate = query.end_date ? new Date(query.end_date) : undefined;

    return this.trafficSourceRepository.getFunnelStats(startDate, endDate);
  }
}
