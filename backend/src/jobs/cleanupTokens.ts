import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });

  console.log(`[CLEANUP] Deleted ${result.count} expired/revoked tokens`);
  return { deletedCount: result.count };
}

if (require.main === module) {
  cleanupExpiredTokens()
    .then(({ deletedCount }) => {
      console.log(`Cleanup completed. Deleted ${deletedCount} tokens.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
