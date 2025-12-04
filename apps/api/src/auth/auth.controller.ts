import { AUTH_INSTANCE_KEY } from '@/constants/auth.constant';
import { All, Controller, Inject, Logger, Req, Res } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(AUTH_INSTANCE_KEY) private readonly auth: Auth) {}

  @All('*')
  async handleAuth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    this.logger.debug(`Request received: ${request.method} ${request.url}`);

    // Convert Fastify request to Web Request
    const url = new URL(
      request.url,
      `${request.protocol}://${request.hostname}`,
    );

    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) {
        headers.append(key, Array.isArray(value) ? value[0] : value);
      }
    });

    // For POST/PUT/PATCH, serialize body
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      body = JSON.stringify(request.body);
    }

    this.logger.debug('Request converted to Web API Request');

    const webRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: body ? body : undefined,
    });

    try {
      this.logger.debug('Calling auth.handler()...');
      const response = await this.auth.handler(webRequest);
      this.logger.debug(`auth.handler() returned: ${response.status}`);

      // Set status
      reply.status(response.status);

      // Copy headers
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      this.logger.debug('Headers set, sending body...');

      // Send body
      if (response.body) {
        const responseBody = await response.text();
        this.logger.debug(
          `Body text extracted, length: ${responseBody.length}`,
        );
        return reply.send(responseBody);
      }

      this.logger.debug('No body, sending empty response');
      return reply.send();
    } catch (error) {
      this.logger.error('Authentication error:', error);
      return reply.status(500).send({
        error: 'Authentication error',
        message: error.message,
      });
    }
  }
}
