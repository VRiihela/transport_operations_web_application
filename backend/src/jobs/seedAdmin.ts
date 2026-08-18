import { PrismaClient, UserRole } from '@prisma/client';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AuthService } from '../services/auth.service';

const prisma = new PrismaClient();

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return (await rl.question(question)).trim();
}

export async function seedAdmin(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const email = (await ask(rl, 'Admin email: ')).toLowerCase();
    if (!email.includes('@')) {
      throw new Error('That does not look like a valid email address.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(
        `A user with email "${email}" already exists (role: ${existing.role}). ` +
        'Nothing to do — this script only creates the first admin.'
      );
      return;
    }

    const name = await ask(rl, 'Admin name (optional, press Enter to skip): ');

    console.log('\nNote: the password will be visible as you type — only run this in a private terminal.');
    const password = await ask(rl, 'Admin password (min 8 characters): ');
    const confirmPassword = await ask(rl, 'Confirm password: ');
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    // Reuses AuthService's own hashing (bcrypt, cost 12) so this account is
    // hashed identically to every account created through the normal API —
    // and gets the same "min 8 characters" check for free.
    const authService = new AuthService(prisma);
    const passwordHash = await authService.hashPassword(password);

    const admin = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role: UserRole.Admin,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    console.log('\nAdmin user created:');
    console.log(admin);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\nSeed failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
