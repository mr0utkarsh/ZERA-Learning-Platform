import { prisma } from './src/config/prisma.js';

const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    role: true
  }
});

console.log(users);

await prisma.$disconnect();