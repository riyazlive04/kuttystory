import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Standalone admin upsert — does NOT touch stories, orders, or any other data.
 *
 * Usage (from packages/database):
 *   ADMIN_EMAIL=admin@kuttystory.co.in ADMIN_PASSWORD='YourPassword' pnpm set-admin
 *
 * - If a user with ADMIN_EMAIL exists, its password + role are updated.
 * - Otherwise a new SUPER_ADMIN user is created.
 */

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      '❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.',
    );
    console.error(
      "   Example: ADMIN_EMAIL=admin@kuttystory.co.in ADMIN_PASSWORD='Secret123' pnpm set-admin",
    );
    process.exit(1);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  const passwordHash = `${salt}:${hash}`;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash,
    },
    create: {
      email,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Admin ready: ${user.email} (${user.role})`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to set admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
