import 'dotenv/config';
import { PrismaClient, MessageStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function createSupabaseUser(email: string, password: string, metadata: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });

  const data = await res.json();

  if (!res.ok && data.code !== 'email_exists') {
    throw new Error(`Failed to create Supabase user: ${JSON.stringify(data)}`);
  }

  if (data.id) {
    return data.id;
  }

  const existingRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const existingUsers = await existingRes.json();
  const existing = existingUsers.users?.find((u: { email: string }) => u.email === email);
  return existing?.id;
}

async function main() {
  console.log('Seeding database...\n');

  const users = [
    {
      email: 'john@example.com',
      password: 'password123',
      username: 'johndoe',
      fullName: 'John Doe',
      bio: 'Hey there! I am using Messenger.',
    },
    {
      email: 'jane@example.com',
      password: 'password123',
      username: 'janedoe',
      fullName: 'Jane Doe',
      bio: 'Hello! Just joined.',
    },
    {
      email: 'devteam@example.com',
      password: 'password123',
      username: 'devteam',
      fullName: 'Dev Team',
      bio: 'Building cool stuff.',
    },
  ];

  const createdUsers = [];

  for (const u of users) {
    console.log(`Creating Supabase user: ${u.email}...`);
    const authId = await createSupabaseUser(u.email, u.password, {
      username: u.username,
      full_name: u.fullName,
    });
    console.log(`  Auth ID: ${authId}`);

    const profile = await prisma.user.upsert({
      where: { username: u.username },
      update: { authId, email: u.email },
      create: {
        authId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        bio: u.bio,
      },
    });
    console.log(`  Profile: ${profile.username} (${profile.id})`);
    createdUsers.push(profile);
  }

  const [user1, user2, user3] = createdUsers;

  let conv1 = await prisma.conversation.findFirst({
    where: {
      type: 'private',
      AND: [
        { members: { some: { userId: user1.id } } },
        { members: { some: { userId: user2.id } } },
      ],
    },
  });

  if (!conv1) {
    conv1 = await prisma.conversation.create({
      data: {
        type: 'private',
        members: {
          create: [
            { userId: user1.id, role: 'member' },
            { userId: user2.id, role: 'member' },
          ],
        },
      },
    });
    console.log(`\nCreated private conversation: ${conv1.id}`);
  } else {
    console.log(`\nPrivate conversation already exists: ${conv1.id}`);
  }

  let conv2 = await prisma.conversation.findFirst({
    where: {
      type: 'group',
      name: 'Dev Chat',
    },
  });

  if (!conv2) {
    conv2 = await prisma.conversation.create({
      data: {
        type: 'group',
        name: 'Dev Chat',
        ownerId: user1.id,
        members: {
          create: [
            { userId: user1.id, role: 'admin' },
            { userId: user2.id, role: 'member' },
            { userId: user3.id, role: 'member' },
          ],
        },
      },
    });
    console.log(`Created group conversation: ${conv2.id}`);
  } else {
    console.log(`Group conversation already exists: ${conv2.id}`);
  }

  const existingMessages = await prisma.message.count({
    where: { conversationId: conv1.id },
  });

  if (existingMessages === 0) {
    const now = new Date();
    const msgs = [
      { senderId: user2.id, text: 'Hey John! How are you?', offset: -300000 },
      { senderId: user1.id, text: "Hi Jane! I'm good, thanks! Working on the new messenger app.", offset: -240000 },
      { senderId: user2.id, text: 'Oh nice! How is it going?', offset: -180000 },
      { senderId: user1.id, text: 'Pretty well! Just set up the real-time messaging.', offset: -120000 },
      { senderId: user2.id, text: "That's awesome! Can I try it?", offset: -60000 },
      { senderId: user1.id, text: 'Sure! I will send you the link later today.', offset: -30000 },
      { senderId: user2.id, text: 'Great, looking forward to it!', offset: 0 },
    ];

    for (const msg of msgs) {
      await prisma.message.create({
        data: {
          conversationId: conv1.id,
          senderId: msg.senderId,
          type: 'text',
          text: msg.text,
          status: MessageStatus.lida,
          createdAt: new Date(now.getTime() + msg.offset),
        },
      });
    }
    console.log(`\nCreated ${msgs.length} messages in private conversation`);
  } else {
    console.log(`\nPrivate conversation already has ${existingMessages} messages`);
  }

  const existingGroupMessages = await prisma.message.count({
    where: { conversationId: conv2.id },
  });

  if (existingGroupMessages === 0) {
    const now = new Date();
    const groupMsgs = [
      { senderId: user1.id, text: 'Welcome to the dev chat everyone!', offset: -200000 },
      { senderId: user3.id, text: 'Hey! Happy to be here.', offset: -150000 },
      { senderId: user2.id, text: 'Hi all! Excited for this project.', offset: -100000 },
      { senderId: user1.id, text: "Let's ship it!", offset: -50000 },
    ];

    for (const msg of groupMsgs) {
      await prisma.message.create({
        data: {
          conversationId: conv2.id,
          senderId: msg.senderId,
          type: 'text',
          text: msg.text,
          status: MessageStatus.lida,
          createdAt: new Date(now.getTime() + msg.offset),
        },
      });
    }
    console.log(`Created ${groupMsgs.length} messages in group conversation`);
  } else {
    console.log(`Group conversation already has ${existingGroupMessages} messages`);
  }

  console.log('\n--- Summary ---');
  console.log(`Users: ${await prisma.user.count()}`);
  console.log(`Conversations: ${await prisma.conversation.count()}`);
  console.log(`Messages: ${await prisma.message.count()}`);
  console.log('\n--- Test Accounts ---');
  console.log('Email: john@example.com | Password: password123 | Username: johndoe');
  console.log('Email: jane@example.com | Password: password123 | Username: janedoe');
  console.log('Email: devteam@example.com | Password: password123 | Username: devteam');
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
