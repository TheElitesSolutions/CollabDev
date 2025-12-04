const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserId() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'demo@collabdev.com' },
      select: { id: true, email: true }
    });

    if (user) {
      console.log('User found:', user);
      console.log('\nUser ID:', user.id);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getUserId();
