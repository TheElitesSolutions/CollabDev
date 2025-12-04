// Simple API test script
const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001';

// Get user ID from seed (we know it's the demo user)
const DEMO_USER_ID = 'demo-user-id'; // This will be replaced with actual ID

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: data ? {
        'Content-Type': 'application/json',
      } : {},
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================');
  console.log('Project API Test Suite');
  console.log('===============================\n');

  try {
    // Test 1: Create Project
    console.log('1. POST /api/project - Create Project');
    console.log('-----------------------------------');
    const createResp = await makeRequest('POST', '/api/project', {
      name: 'Test Project',
      description: 'API validation test project'
    });
    console.log(`Status: ${createResp.status}`);
    console.log('Response:', JSON.stringify(createResp.data, null, 2));

    if (createResp.data && createResp.data.id) {
      const projectId = createResp.data.id;
      console.log(`\n✓ Project created with ID: ${projectId}\n`);

      // Test 2: List Projects
      console.log('2. GET /api/project - List Projects');
      console.log('-----------------------------------');
      const listResp = await makeRequest('GET', '/api/project');
      console.log(`Status: ${listResp.status}`);
      console.log('Response:', JSON.stringify(listResp.data, null, 2));
      console.log('');

      // Test 3: Get Project by ID
      console.log(`3. GET /api/project/${projectId} - Get Project`);
      console.log('-----------------------------------');
      const getResp = await makeRequest('GET', `/api/project/${projectId}`);
      console.log(`Status: ${getResp.status}`);
      console.log('Response:', JSON.stringify(getResp.data, null, 2));
      console.log('');

      // Test 4: Update Project
      console.log(`4. PATCH /api/project/${projectId} - Update Project`);
      console.log('-----------------------------------');
      const updateResp = await makeRequest('PATCH', `/api/project/${projectId}`, {
        name: 'Updated Test Project',
        description: 'Updated description'
      });
      console.log(`Status: ${updateResp.status}`);
      console.log('Response:', JSON.stringify(updateResp.data, null, 2));
      console.log('');

      // Test 5: Get Members
      console.log(`5. GET /api/project/${projectId}/members - Get Members`);
      console.log('-----------------------------------');
      const membersResp = await makeRequest('GET', `/api/project/${projectId}/members`);
      console.log(`Status: ${membersResp.status}`);
      console.log('Response:', JSON.stringify(membersResp.data, null, 2));
      console.log('');

      // Test 6: Delete Project
      console.log(`6. DELETE /api/project/${projectId} - Delete Project`);
      console.log('-----------------------------------');
      const deleteResp = await makeRequest('DELETE', `/api/project/${projectId}`);
      console.log(`Status: ${deleteResp.status}`);
      console.log('Response:', JSON.stringify(deleteResp.data, null, 2));
      console.log('');

      // Test 7: Verify Deletion
      console.log(`7. GET /api/project/${projectId} - Verify Deletion`);
      console.log('-----------------------------------');
      const verifyResp = await makeRequest('GET', `/api/project/${projectId}`);
      console.log(`Status: ${verifyResp.status}`);
      console.log('Response:', JSON.stringify(verifyResp.data, null, 2));
      console.log('');
    }

    console.log('===============================');
    console.log('✓ Test Suite Complete!');
    console.log('===============================');

  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

runTests();
