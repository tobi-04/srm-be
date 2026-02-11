import { Injectable, Logger } from "@nestjs/common";
import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
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
    learning_url?: string;
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
  private readonly templatesPath = path.join(
    __dirname,
    "..",
    "templates"
  );

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
   * Load and render template from file
   */
  async renderTemplateFromFile(
    templateName: string,
    variables: TemplateVariables
  ): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      
      // Check if file exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      // Read template file
      const templateContent = fs.readFileSync(templatePath, "utf-8");
      
      // Compile and render
      const compiledTemplate = Handlebars.compile(templateContent);
      const rendered = compiledTemplate(variables);
      
      this.logger.log(`Template "${templateName}" rendered successfully`);
      
      return rendered;
    } catch (error) {
      this.logger.error(
        `Failed to render template from file "${templateName}":`,
        error
      );
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Get available variables for a specific event type
   */
  getAvailableVariables(eventType: EventType): string[] {
    const commonVariables = ["{{user.name}}", "{{user.email}}"];

    const eventSpecificVariables: Record<string, string[]> = {
      [EventType.USER_REGISTERED]: [...commonVariables],
      [EventType.COURSE_PURCHASED]: [
        ...commonVariables,
        "{{course.title}}",
        "{{course.id}}",
        "{{course.learning_url}}",
        "{{order.amount}}",
        "{{temp_password}}",
        "{{is_new_user}}",
      ],
      [EventType.BOOK_PURCHASED]: [
        ...commonVariables,
        "{{book.title}}",
        "{{order.amount}}",
        "{{order.id}}",
      ],
      [EventType.INDICATOR_PURCHASED]: [
        ...commonVariables,
        "{{indicator.name}}",
        "{{subscription.amount}}",
        "{{subscription.start_at}}",
        "{{subscription.end_at}}",
      ],
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED]: [
        ...commonVariables,
        "{{daysSinceRegistration}}",
      ],
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED_BOOK]: [
        ...commonVariables,
        "{{daysSinceRegistration}}",
      ],
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED_INDICATOR]: [
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
    const sampleData: Record<string, TemplateVariables> = {
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
          id: "696ddcaa645bd1147bad6647",
          learning_url: "http://localhost:5173/learn/696ddcaa645bd1147bad6647",
        },
        order: {
          amount: 299000,
        },
        temp_password: "ZLP123456",
        is_new_user: true,
      },
      [EventType.BOOK_PURCHASED]: {
        user: { name: "John Doe", email: "john@example.com" },
        book: { title: "Ebook Trading 101" },
        order: { amount: 150000, id: "ORDER123" },
      },
      [EventType.INDICATOR_PURCHASED]: {
        user: { name: "John Doe", email: "john@example.com" },
        indicator: { name: "Golden Signal Pro" },
        subscription: {
          amount: 500000,
          start_at: new Date(),
          end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED]: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        daysSinceRegistration: 3,
      },
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED_BOOK]: {
        user: { name: "John Doe", email: "john@example.com" },
        daysSinceRegistration: 1,
      },
      [EventType.USER_REGISTERED_BUT_NOT_PURCHASED_INDICATOR]: {
        user: { name: "John Doe", email: "john@example.com" },
        daysSinceRegistration: 1,
      },
    };

    try {
      return this.renderTemplate(template, sampleData[eventType] || {});
    } catch (error) {
      return `Preview error: ${error.message}`;
    }
  }
}
