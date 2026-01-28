import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { IndicatorRepository } from "./indicator.repository";
import {
  CreateIndicatorDto,
  UpdateIndicatorDto,
  SearchIndicatorDto,
} from "./dto/indicator.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { Indicator, IndicatorStatus } from "./entities/indicator.entity";
import {
  IndicatorSubscription,
  SubscriptionStatus,
} from "./entities/indicator-subscription.entity";

@Injectable()
export class IndicatorStoreService {
  constructor(
    private readonly indicatorRepository: IndicatorRepository,
    @InjectModel(IndicatorSubscription.name)
    private readonly subscriptionModel: Model<IndicatorSubscription>,
  ) {}

  /**
   * Generate unique slug from name
   */
  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .trim() +
      "-" +
      Date.now()
    );
  }

  async create(createIndicatorDto: CreateIndicatorDto) {
    const slug = this.generateSlug(createIndicatorDto.name);
    const indicator = await this.indicatorRepository.create({
      ...createIndicatorDto,
      slug,
      price_monthly: Number(createIndicatorDto.price_monthly),
    } as any);

    await this.indicatorRepository.invalidateCache();
    return indicator;
  }

  async findAll(
    paginationDto: PaginationDto,
    searchDto: SearchIndicatorDto,
    isAdmin: boolean = false,
  ) {
    const { page, limit, sort, order, search } = paginationDto;
    const { status } = searchDto;

    const filter: any = {};

    if (!isAdmin) {
      filter.status = IndicatorStatus.ACTIVE;
    } else if (status) {
      filter.status = status;
    }

    return this.indicatorRepository.paginate(filter, {
      page,
      limit,
      sort: sort || "created_at",
      order,
      search,
      searchFields: ["name", "description"],
      useCache: true,
      cacheTTL: 600,
      includeDeleted: false,
    });
  }

  async findOne(id: string, isAdmin: boolean = false) {
    const indicator = await this.indicatorRepository.findById(id);

    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    if (!isAdmin && indicator.status === IndicatorStatus.INACTIVE) {
      throw new NotFoundException("Indicator not found");
    }

    return indicator;
  }

  async findBySlug(slug: string, isAdmin: boolean = false) {
    const indicator = await this.indicatorRepository.findBySlug(slug);

    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    if (!isAdmin && indicator.status === IndicatorStatus.INACTIVE) {
      throw new NotFoundException("Indicator not found");
    }

    return indicator;
  }

  /**
   * Get indicator with contact info - ONLY for subscribed users
   */
  async findBySlugWithContact(
    slug: string,
    userId?: string,
  ): Promise<Indicator & { has_subscription: boolean }> {
    const indicator = await this.indicatorRepository.findBySlug(slug);

    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    if (indicator.status === IndicatorStatus.INACTIVE) {
      throw new NotFoundException("Indicator not found");
    }

    // Check if user has active subscription
    let hasSubscription = false;
    if (userId) {
      const subscription = await this.subscriptionModel.findOne({
        user_id: new Types.ObjectId(userId),
        indicator_id: (indicator as any)._id,
        status: SubscriptionStatus.ACTIVE,
        is_deleted: false,
      });
      hasSubscription = !!subscription;
    }

    // If no subscription, hide contact info
    if (!hasSubscription) {
      return {
        ...(indicator as any).toObject(),
        owner_name: "",
        contact_email: "",
        contact_telegram: "",
        description_detail: "",
        has_subscription: false,
      };
    }

    return {
      ...(indicator as any).toObject(),
      has_subscription: true,
    };
  }

  async update(id: string, updateIndicatorDto: UpdateIndicatorDto) {
    const indicator = await this.indicatorRepository.findById(id);
    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    // Update fields
    const updateData: any = { ...updateIndicatorDto };
    if (updateIndicatorDto.price_monthly !== undefined) {
      updateData.price_monthly = Number(updateIndicatorDto.price_monthly);
    }

    const updated = await this.indicatorRepository.updateById(id, updateData);

    // Invalidate cache
    await this.indicatorRepository.invalidateCache();
    await this.indicatorRepository.invalidateCacheById(id);

    return updated;
  }

  async delete(id: string) {
    const indicator = await this.indicatorRepository.deleteById(id);
    if (!indicator) {
      throw new NotFoundException("Indicator not found");
    }

    await this.indicatorRepository.invalidateCache();
    await this.indicatorRepository.invalidateCacheById(id);

    return { message: "Indicator deleted successfully" };
  }

  /**
   * Check if user has active subscription to an indicator
   */
  async checkSubscription(
    userId: string,
    indicatorId: string,
  ): Promise<boolean> {
    const subscription = await this.subscriptionModel.findOne({
      user_id: new Types.ObjectId(userId),
      indicator_id: new Types.ObjectId(indicatorId),
      status: SubscriptionStatus.ACTIVE,
      is_deleted: false,
    });
    return !!subscription;
  }
}
