import { AuditEvent } from '@prisma/client';

export interface AuditMetadata {
  email?: string;
  error?: string;
  tokenId?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  [key: string]: unknown;
}

export interface CreateAuditLogParams {
  event: AuditEvent;
  userId?: string;
  ip: string;
  userAgent?: string;
  metadata?: AuditMetadata;
}
