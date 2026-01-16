import { Injectable, Logger } from "@nestjs/common";
import * as Handlebars from "handlebars";
import { EventType } from "../entities/email-automation.entity";

export interface TemplateVariables {
  user?: {
    name: string;
    email: string;
    id?: string;
  };
  course?: {
    title: string;
    id?: string;
  };
  order?: {
    amount: number;
    id?: string;
  };
  [key: string]: any;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  /**
   * Render Handlebars template with variables
   */
  renderTemplate(template: string, variables: TemplateVariables): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(variables);
    } catch (error) {
      this.logger.error("Failed to render template:", error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Get available variables for a specific event type
   */
  getAvailableVariables(eventType: EventType): string[] {
    const commonVariables = ["{{user.name}}", "{{user.email}}"];

    const eventSpecificVariables: Record<EventType, string[]> = {
      [EventType.USER_REGISTERED]: [...commonVariables],
      [EventType.COURSE_PURCHASED]: [
        ...commonVariables,
        "{{course.title}}",
        "{{order.amount}}",
        "{{temp_password}}",
        "{{is_new_user}}",
      ],
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED]: [
        ...commonVariables,
        "{{daysSinceRegistration}}",
      ],
    };

    return eventSpecificVariables[eventType] || commonVariables;
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get template preview with sample data
   */
  getTemplatePreview(template: string, eventType: EventType): string {
    const sampleData: Record<EventType, TemplateVariables> = {
      [EventType.USER_REGISTERED]: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
      },
      [EventType.COURSE_PURCHASED]: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        course: {
          title: "Advanced Web Development",
        },
        order: {
          amount: 299000,
        },
        temp_password: "ZLP123456",
        is_new_user: true,
      },
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED]: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        daysSinceRegistration: 3,
      },
    };

    try {
      return this.renderTemplate(template, sampleData[eventType] || {});
    } catch (error) {
      return `Preview error: ${error.message}`;
    }
  }
}
