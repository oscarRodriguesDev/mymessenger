import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  const khakha = await prisma.user.findUnique({ where: { username: 'khakha' } });
  if (!khakha) {
    console.log('User khakha not found. Create it first via the app signup.');
    return;
  }
  console.log(`Found user: ${khakha.username} (${khakha.id})`);

  const conversations = await prisma.conversation.findMany({
    include: { members: true },
  });

  for (const conv of conversations) {
    const isMember = conv.members.some(m => m.userId === khakha.id);
    if (!isMember) {
      await prisma.conversationMember.create({
        data: {
          conversationId: conv.id,
          userId: khakha.id,
          role: 'member',
        },
      });
      console.log(`Added khakha to conversation: ${conv.name || conv.id}`);
    } else {
      console.log(`khakha is already in conversation: ${conv.name || conv.id}`);
    }
  }

  console.log('\nDone!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
