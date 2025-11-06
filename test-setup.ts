import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    const userCount = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`📊 Users in database: ${userCount}`);
    
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log('👥 Users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();