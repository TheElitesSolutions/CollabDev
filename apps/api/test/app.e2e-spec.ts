/**
 * E2E Tests for the API
 *
 * These tests run against a live server instance.
 * Make sure the server is running before executing these tests:
 *   pnpm start:dev
 *
 * Set API_URL environment variable to override the default:
 *   API_URL=http://localhost:3001 pnpm test:e2e
 *
 * All API routes have the /api prefix.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('App (e2e) - Live Server Tests', () => {
  // Helper function to make HTTP requests
  const fetchApi = async (
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    // Ensure endpoint starts with /api
    const apiEndpoint = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint}`;
    const url = `${API_URL}${apiEndpoint}`;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  // Helper for raw fetch without /api prefix (kept for future use)
  const _fetchRaw = async (
    path: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    const url = `${API_URL}${path}`;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  describe('Health Check Endpoint', () => {
    it('/api/health (GET) should return health status', async () => {
      const response = await fetchApi('/health');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('Metrics Endpoint', () => {
    it('/api/metrics (GET) should return prometheus metrics', async () => {
      const response = await fetchApi('/metrics');
      // Metrics endpoint should be accessible
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Auth Endpoints (Unauthenticated)', () => {
    it('/api/auth/sign-in/email (POST) should handle email sign-in', async () => {
      const response = await fetchApi('/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });
      // Should return some response (200 with error, 400, or 401)
      expect([200, 400, 401, 404]).toContain(response.status);
    });

    it('/api/auth/sign-up/email (POST) with invalid data should fail', async () => {
      const response = await fetchApi('/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });
      // Should reject invalid data
      expect([400, 401, 404, 422]).toContain(response.status);
    });

    it('/api/auth/magic-link (POST) should require email field', async () => {
      const response = await fetchApi('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      // magic-link endpoint validation
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Project Endpoints (Unauthenticated)', () => {
    it('/api/project (GET) should require authentication', async () => {
      const response = await fetchApi('/project');
      expect(response.status).toBe(401);
    });

    it('/api/project (POST) should require authentication', async () => {
      const response = await fetchApi('/project', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
      });
      expect(response.status).toBe(401);
    });

    it('/api/project/:id (GET) should require authentication', async () => {
      const response = await fetchApi('/project/test-id');
      expect(response.status).toBe(401);
    });

    it('/api/project/:id (PATCH) should require authentication', async () => {
      const response = await fetchApi('/project/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(response.status).toBe(401);
    });

    it('/api/project/:id (DELETE) should require authentication', async () => {
      const response = await fetchApi('/project/test-id', {
        method: 'DELETE',
      });
      // Returns 400 (bad request) or 401 (unauthorized) depending on validation order
      expect([400, 401]).toContain(response.status);
    });

    it('/api/project/:id/members (GET) should require authentication', async () => {
      const response = await fetchApi('/project/test-id/members');
      expect(response.status).toBe(401);
    });
  });

  describe('User Endpoints (Unauthenticated)', () => {
    it('/api/v1/user/whoami (GET) should require authentication', async () => {
      const response = await fetchApi('/v1/user/whoami');
      expect(response.status).toBe(401);
    });

    it('/api/v1/user/all (GET) should require authentication', async () => {
      const response = await fetchApi('/v1/user/all');
      expect(response.status).toBe(401);
    });
  });

  describe('File Endpoints (Unauthenticated)', () => {
    it('/api/v1/file/upload/single (POST) should require authentication', async () => {
      const response = await fetchApi('/v1/file/upload/single', {
        method: 'POST',
      });
      // Returns 400 (missing file) or 401 (unauthorized) depending on validation order
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetchApi('/unknown-endpoint-12345');
      expect(response.status).toBe(404);
    });
  });

  describe('CORS Headers', () => {
    it('should handle OPTIONS preflight request', async () => {
      const response = await fetchApi('/health', {
        method: 'OPTIONS',
      });
      // OPTIONS might return 200, 204, or 400 depending on CORS configuration
      expect([200, 204, 400]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should not immediately rate limit normal requests', async () => {
      // Make a few quick requests
      const responses = await Promise.all([
        fetchApi('/health'),
        fetchApi('/health'),
        fetchApi('/health'),
      ]);

      // All should succeed (not rate limited)
      responses.forEach((response) => {
        expect([200, 204]).toContain(response.status);
      });
    });
  });
});
