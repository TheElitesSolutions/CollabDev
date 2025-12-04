// Day 2 Comprehensive Test Script - Using built-in fetch (Node 18+)
const BASE_URL = 'http://localhost:3001';

// Simple cookie storage
class SimpleCookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setCookie(cookie) {
    const parts = cookie.split(';')[0].split('=');
    const name = parts[0];
    const value = parts.slice(1).join('=');
    this.cookies.set(name, value);
  }

  getCookieString() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

// Test helpers
async function loginUser(email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);

  const jar = new SimpleCookieJar();

  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Store cookies
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => jar.setCookie(cookie));

    const data = await response.json();

    if (response.ok && data.user) {
      console.log(`✅ Logged in: ${data.user.email}`);
      return { user: data.user, jar };
    } else {
      console.log(`❌ Login failed:`, data);
      return null;
    }
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return null;
  }
}

async function testWithAuth(jar, method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': jar.getCookieString(),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function testNeo4j() {
  console.log('\n🗃️  Testing Neo4j Integration...');

  try {
    const neo4j = await import('neo4j-driver');
    const driver = neo4j.default.driver(
      'bolt://localhost:7687',
      neo4j.default.auth.basic('neo4j', 'neo4jpassword')
    );

    const session = driver.session();
    const result = await session.run('MATCH (p:Project) RETURN p');

    console.log(`✅ Neo4j connected: ${result.records.length} project(s) found`);

    result.records.forEach(record => {
      const project = record.get('p').properties;
      console.log(`   - ${project.name} (${project.id})`);
    });

    await session.close();
    await driver.close();

    return true;
  } catch (error) {
    console.log(`❌ Neo4j error: ${error.message}`);
    return false;
  }
}

async function testRedis() {
  console.log('\n💾 Testing Redis Caching...');

  try {
    const Redis = await import('ioredis');
    const redis = new Redis.default({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });

    await redis.connect();

    const keys = await redis.keys('*project:user:*');
    console.log(`✅ Redis connected: ${keys.length} cache key(s) found`);

    if (keys.length > 0) {
      console.log(`   Cache keys: ${keys.join(', ')}`);
    }

    await redis.quit();

    return true;
  } catch (error) {
    console.log(`❌ Redis error: ${error.message}`);
    return false;
  }
}

async function testCacheTiming(jar) {
  console.log('\n⏱️  Testing Cache Performance...');

  // First request (cache miss)
  const start1 = Date.now();
  await testWithAuth(jar, 'GET', '/api/project');
  const time1 = Date.now() - start1;

  console.log(`   First request: ${time1}ms (cache miss)`);

  // Second request (cache hit)
  const start2 = Date.now();
  await testWithAuth(jar, 'GET', '/api/project');
  const time2 = Date.now() - start2;

  console.log(`   Second request: ${time2}ms (cache hit)`);

  if (time2 < time1) {
    console.log(`✅ Caching working: ${Math.round((1 - time2/time1) * 100)}% faster`);
  } else {
    console.log(`⚠️  Cache may not be working (second request not faster)`);
  }
}

async function runTests() {
  console.log('🧪 Starting Day 2 Comprehensive Tests\n');
  console.log('=' .repeat(60));

  // Test infrastructure
  const neo4jOk = await testNeo4j();
  const redisOk = await testRedis();

  console.log('\n' + '='.repeat(60));
  console.log('👥 Testing Multi-User Access\n');

  // Test User 1 (OWNER)
  const user1 = await loginUser('demo1@collabdev.com', 'password123');
  if (!user1) {
    console.log('❌ User 1 login failed - skipping tests');
    return;
  }

  console.log('\n📋 User 1 - Fetching projects...');
  const projects1 = await testWithAuth(user1.jar, 'GET', '/api/project');

  if (projects1.ok) {
    console.log(`✅ User 1 has ${projects1.data.length} project(s)`);
    projects1.data.forEach(p => {
      const userMembership = p.members?.find(m => m.userId === user1.user.id);
      console.log(`   - ${p.name} (role: ${userMembership?.role || 'N/A'})`);
    });
  } else {
    console.log(`❌ User 1 projects fetch failed: ${projects1.status}`, projects1.data);
  }

  // Test User 2 (MEMBER)
  const user2 = await loginUser('demo2@collabdev.com', 'password123');
  if (!user2) {
    console.log('❌ User 2 login failed - skipping tests');
    return;
  }

  console.log('\n📋 User 2 - Fetching projects...');
  const projects2 = await testWithAuth(user2.jar, 'GET', '/api/project');

  if (projects2.ok) {
    console.log(`✅ User 2 has ${projects2.data.length} project(s)`);
    projects2.data.forEach(p => {
      const userMembership = p.members?.find(m => m.userId === user2.user.id);
      console.log(`   - ${p.name} (role: ${userMembership?.role || 'N/A'})`);
    });
  } else {
    console.log(`❌ User 2 projects fetch failed: ${projects2.status}`, projects2.data);
  }

  // Test cache timing with User 1
  if (user1 && projects1.ok) {
    await testCacheTiming(user1.jar);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  console.log(`   Neo4j: ${neo4jOk ? '✅' : '❌'}`);
  console.log(`   Redis: ${redisOk ? '✅' : '❌'}`);
  console.log(`   User 1 Login: ${user1 ? '✅' : '❌'}`);
  console.log(`   User 1 Projects: ${projects1?.ok ? '✅' : '❌'}`);
  console.log(`   User 2 Login: ${user2 ? '✅' : '❌'}`);
  console.log(`   User 2 Projects: ${projects2?.ok ? '✅' : '❌'}`);
  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  const allPassed = neo4jOk && redisOk && user1 && projects1?.ok && user2 && projects2?.ok;
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
