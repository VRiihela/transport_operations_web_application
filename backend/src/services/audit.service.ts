import { PrismaClient, AuditEvent, Prisma } from '@prisma/client';
import { Request } from 'express';
import { AuditMetadata, CreateAuditLogParams } from '../types/audit.types';

const prisma = new PrismaClient();

const METADATA_SIZE_LIMIT = 1024; // 1KB

export class AuditService {
  private static extractIpAddress(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      const firstIp = forwarded.split(',')[0].trim();
      if (firstIp.length > 45 || /<|>|script/i.test(firstIp)) {
        return req.ip ?? 'unknown';
      }
      return firstIp;
    }
    return req.ip ?? 'unknown';
  }

  private static sanitizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    return userAgent
      .slice(0, 500)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/[<>]/g, '') || undefined;
  }

  private static validateMetadata(metadata?: AuditMetadata): AuditMetadata | undefined {
    if (!metadata) return undefined;

    const serialized = JSON.stringify(metadata);
    if (serialized.length > METADATA_SIZE_LIMIT) {
      throw new Error(`Audit metadata exceeds ${METADATA_SIZE_LIMIT} byte limit`);
    }

    const cleaned = { ...metadata };
    // Never log credentials or raw tokens
    delete cleaned['password'];
    delete cleaned['token'];
    delete cleaned['refreshToken'];
    return cleaned;
  }

  static async logEvent(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedMetadata = this.validateMetadata(params.metadata);
      const sanitizedUserAgent = this.sanitizeUserAgent(params.userAgent);

      await prisma.auditLog.create({
        data: {
          event: params.event,
          userId: params.userId ?? null,
          ip: params.ip.slice(0, 45),
          userAgent: sanitizedUserAgent,
          metadata: sanitizedMetadata as Prisma.InputJsonObject | undefined,
        },
      });

      console.log(
        `[AUDIT] ${params.event}: ${params.ip}${params.userId ? ` (user: ${params.userId})` : ''}`,
        sanitizedMetadata
      );
    } catch (error) {
      // Audit failures must not break the main request flow
      console.error('[AUDIT ERROR]', error);
    }
  }

  static async logFromRequest(
    req: Request,
    event: AuditEvent,
    userId?: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    await this.logEvent({
      event,
      userId,
      ip: this.extractIpAddress(req),
      userAgent: req.get('User-Agent'),
      metadata,
    });
  }
}
