import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from '../telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
              if (key === 'TELEGRAM_CHAT_ID') return '-100123456789';
              if (key === 'TELEGRAM_ENABLED') return 'true';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should format amount correctly', () => {
    const formatted = service.formatAmount(1000000);
    expect(formatted).toContain('1.000.000');
  });

  it('should format datetime correctly', () => {
    const date = new Date('2026-02-06T14:30:00');
    const formatted = service.formatDateTime(date);
    expect(formatted).toBeTruthy();
  });
});
