export interface RequiredEnvVars {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  DATABASE_URL: string;
}

export function validateEnvironment(): RequiredEnvVars {
  const missingVars: string[] = [];

  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!JWT_SECRET) missingVars.push('JWT_SECRET');
  if (!JWT_REFRESH_SECRET) missingVars.push('JWT_REFRESH_SECRET');
  if (!DATABASE_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  if (JWT_SECRET!.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  if (JWT_REFRESH_SECRET!.length < 32) {
    console.error('JWT_REFRESH_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  return {
    JWT_SECRET: JWT_SECRET!,
    JWT_REFRESH_SECRET: JWT_REFRESH_SECRET!,
    DATABASE_URL: DATABASE_URL!,
  };
}
