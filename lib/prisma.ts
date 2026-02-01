import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const req = (0, eval)('require') as NodeRequire;
  const { PrismaBetterSqlite3 } = req('@prisma/adapter-better-sqlite3') as typeof import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
