import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'admin.vera@example.com';

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('AdminPass123', 12);
    await prisma.user.create({
      data: {
        name: 'Admin Vera',
        email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: { create: {} }
      }
    });
    console.log('created-admin');
  } else {
    console.log('admin-exists');
  }
} finally {
  await prisma.$disconnect();
}
