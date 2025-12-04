/* eslint-disable no-console */
import { PrismaClient, ProjectRole, Role } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor, username } from 'better-auth/plugins';
import { passkey } from 'better-auth/plugins/passkey';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Running seed...');

  console.log('Checking envionment variables...');
  const adminEmail = process.env.APP_ADMIN_EMAIL;
  if (!adminEmail) {
    console.error(
      '❌ APP_ADMIN_EMAIL is not set in the environment variables.',
    );
    process.exit(1);
  }

  const password = process.env.APP_ADMIN_PASSWORD;
  if (!password) {
    console.error(
      '❌ APP_ADMIN_PASSWORD is not set in the environment variables.',
    );
    process.exit(1);
  }

  const auth = betterAuth({
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      username({
        usernameValidator: () => {
          return true;
        },
      }),
      twoFactor({
        schema: {
          twoFactor: {
            modelName: 'two_factors',
          },
        },
      }),
      passkey({
        rpName: 'Boilerplate API',
      }),
    ],
    user: {
      fields: {
        name: 'firstName',
        emailVerified: 'isEmailVerified',
      },
    },
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
  });

  const res = await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      name: 'Admin User',
      username: adminEmail,
      password: password,
    },
  });

  console.log('🌟 User created with success!');

  await prisma.user.update({
    where: { id: res.user.id },
    data: {
      role: Role.Admin,
      isEmailVerified: true,
    },
  });
  console.log('✅ User updated with success!');

  // Delete the session for the user
  console.log('Delete the session for the user...');
  await prisma.session.deleteMany({
    where: {
      userId: res.user.id,
    },
  });

  console.log('✅ User session deleted successfully!');

  // Create Demo User 1 (OWNER)
  console.log('Creating demo user 1 (demo@collabdev.com)...');
  const demo1Res = await auth.api.signUpEmail({
    body: {
      email: 'demo@collabdev.com',
      name: 'Demo User',
      username: 'demouser',
      password: 'password123',
    },
  });

  await prisma.user.update({
    where: { id: demo1Res.user.id },
    data: {
      isEmailVerified: true,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: demo1Res.user.id,
    },
  });

  console.log('✅ Demo user 1 created successfully!');

  // Create Demo User 2 (MEMBER)
  console.log('Creating demo user 2 (collaborator@collabdev.com)...');
  const demo2Res = await auth.api.signUpEmail({
    body: {
      email: 'collaborator@collabdev.com',
      name: 'Collaborator User',
      username: 'collaborator',
      password: 'password123',
    },
  });

  await prisma.user.update({
    where: { id: demo2Res.user.id },
    data: {
      isEmailVerified: true,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: demo2Res.user.id,
    },
  });

  console.log('✅ Demo user 2 created successfully!');

  // Create Shared Project
  console.log('Creating shared project...');
  const project = await prisma.project.create({
    data: {
      name: 'Shared Project Alpha',
      description:
        'A demo project shared between multiple users for testing collaboration features',
      createdByUserId: demo1Res.user.id,
      members: {
        create: [
          { userId: demo1Res.user.id, role: ProjectRole.OWNER },
          { userId: demo2Res.user.id, role: ProjectRole.MEMBER },
        ],
      },
    },
  });

  console.log('✅ Shared project created successfully!');

  // Create Neo4j node for project
  console.log('Creating Neo4j node for project...');
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUsername = process.env.NEO4J_USERNAME || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'neo4jpassword';

  let neo4jDriver;
  try {
    neo4jDriver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUsername, neo4jPassword),
    );
    await neo4jDriver.verifyConnectivity();

    const session = neo4jDriver.session();
    try {
      await session.run(
        'CREATE (p:Project {id: $id, name: $name, description: $description, createdAt: datetime()})',
        {
          id: project.id,
          name: project.name,
          description: project.description || '',
        },
      );
      console.log('✅ Neo4j node created successfully!');
    } catch (error) {
      console.warn(
        '⚠️  Failed to create Neo4j node:',
        (error as Error).message,
      );
    } finally {
      await session.close();
    }
  } catch (error) {
    console.warn(
      '⚠️  Neo4j connection failed (continuing without graph database):',
      (error as Error).message,
    );
  } finally {
    if (neo4jDriver) {
      await neo4jDriver.close();
    }
  }

  console.log('');
  console.log('📋 Seed Summary:');
  console.log(`   Admin: ${adminEmail} / ${password}`);
  console.log(`   Demo User 1 (OWNER): demo@collabdev.com / password123`);
  console.log(
    `   Demo User 2 (MEMBER): collaborator@collabdev.com / password123`,
  );
  console.log(`   Shared Project: ${project.id} - ${project.name}`);
  console.log('');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
