import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { BetterAuthService } from '@/auth/better-auth.service';
import { PrismaService } from '@/database/prisma.service';

// Message types for y-websocket protocol
const messageSync = 0;
const messageAwareness = 1;

// Callback types
type UpdateCallback = (update: Uint8Array, origin: unknown, doc: Y.Doc) => void;
type AwarenessChangeCallback = (
  changes: { added: number[]; updated: number[]; removed: number[] },
  conn: WebSocket | null,
) => void;

interface YjsDocument {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  connections: Map<WebSocket, Set<number>>;
}

@Injectable()
export class YjsServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YjsServerService.name);
  private wss: WebSocketServer | null = null;
  private documents: Map<string, YjsDocument> = new Map();

  constructor(
    private readonly betterAuthService: BetterAuthService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('YjsServerService initialized');
  }

  onModuleDestroy() {
    this.cleanup();
  }

  /**
   * Attach WebSocket server to existing HTTP server
   */
  attachToServer(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
      // Only handle /yjs path
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (!url.pathname.startsWith('/yjs')) {
        return;
      }

      // Extract room name from path: /yjs/file:projectId:fileId
      // Remove '/yjs/' prefix (6 chars including trailing slash)
      const roomName = url.pathname.slice(5).replace(/^\//, '');

      if (!roomName) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      // Authenticate using cookies
      try {
        const session = await this.betterAuthService.api.getSession({
          headers: new Headers({
            cookie: request.headers.cookie || '',
          }),
        });

        if (!session?.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Verify access to the file
        const hasAccess = await this.verifyAccess(roomName, session.user.id);
        if (!hasAccess) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // Upgrade to WebSocket
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request, {
            roomName,
            user: session.user,
          });
        });
      } catch (error) {
        this.logger.error('Auth error during WebSocket upgrade:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });

    this.wss.on(
      'connection',
      (
        ws: WebSocket,
        _request: unknown,
        context: { roomName: string; user: { id: string; name?: string; email?: string } },
      ) => {
        this.handleConnection(ws, context.roomName, context.user);
      },
    );

    this.logger.log('Yjs WebSocket server attached to HTTP server');
  }

  /**
   * Verify user has access to the room (file or page)
   */
  private async verifyAccess(roomName: string, userId: string): Promise<boolean> {
    const parts = roomName.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [roomType, projectId, resourceId] = parts;

    // Check project membership
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        deletedAt: null,
      },
    });

    if (!membership) {
      return false;
    }

    // Verify based on room type
    if (roomType === 'file') {
      // Check file exists in project
      const file = await this.prisma.projectFile.findFirst({
        where: {
          id: resourceId,
          projectId,
          isFolder: false,
        },
      });
      return !!file;
    } else if (roomType === 'page') {
      // Check page exists in project
      const page = await this.prisma.page.findFirst({
        where: {
          id: resourceId,
          projectId,
        },
      });
      return !!page;
    }

    return false;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(
    ws: WebSocket,
    roomName: string,
    user: { id: string; name?: string; email?: string },
  ) {
    this.logger.log(`User ${user.id} connected to room ${roomName}`);

    // Get or create document
    const yjsDoc = this.getOrCreateDocument(roomName);
    const { doc, awareness, connections } = yjsDoc;

    // Track connection's awareness client IDs
    connections.set(ws, new Set());

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    this.send(ws, encoding.toUint8Array(encoder));

    // Send awareness state
    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())),
      );
      this.send(ws, encoding.toUint8Array(awarenessEncoder));
    }

    // Handle messages
    ws.on('message', (data: Buffer) => {
      try {
        this.handleMessage(ws, yjsDoc, new Uint8Array(data), user);
      } catch (error) {
        this.logger.error('Error handling message:', error);
      }
    });

    // Handle close
    ws.on('close', () => {
      this.handleDisconnect(ws, yjsDoc, roomName);
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.error(`WebSocket error in room ${roomName}:`, error);
      this.handleDisconnect(ws, yjsDoc, roomName);
    });
  }

  /**
   * Get or create a Yjs document for a room
   */
  private getOrCreateDocument(roomName: string): YjsDocument {
    let yjsDoc = this.documents.get(roomName);

    if (!yjsDoc) {
      const doc = new Y.Doc();
      const awareness = new awarenessProtocol.Awareness(doc);

      yjsDoc = {
        doc,
        awareness,
        connections: new Map(),
      };

      // Broadcast document updates
      const updateHandler: UpdateCallback = (update, origin) => {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        const message = encoding.toUint8Array(encoder);

        yjsDoc!.connections.forEach((_, conn) => {
          if (conn !== origin) {
            this.send(conn, message);
          }
        });
      };
      doc.on('update', updateHandler);

      // Broadcast awareness updates
      const awarenessHandler: AwarenessChangeCallback = ({ added, updated, removed }, origin) => {
        const changedClients = added.concat(updated, removed);
        if (changedClients.length > 0) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageAwareness);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
          );
          const message = encoding.toUint8Array(encoder);

          yjsDoc!.connections.forEach((_, conn) => {
            if (conn !== origin) {
              this.send(conn, message);
            }
          });
        }
      };
      awareness.on('update', awarenessHandler);

      this.documents.set(roomName, yjsDoc);
      this.logger.log(`Created new Yjs document for room ${roomName}`);
    }

    return yjsDoc;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(
    ws: WebSocket,
    yjsDoc: YjsDocument,
    message: Uint8Array,
    _user: { id: string; name?: string; email?: string },
  ) {
    const { doc, awareness, connections } = yjsDoc;
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

        // If sync step 2, we have updates to apply
        if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
          // Sync step 2 contains updates, already applied by readSyncMessage
        }

        if (encoding.length(encoder) > 1) {
          this.send(ws, encoding.toUint8Array(encoder));
        }
        break;
      }

      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);

        // Track awareness client IDs for this connection
        const clientIds = connections.get(ws);
        if (clientIds) {
          const decoder2 = decoding.createDecoder(update);
          const len = decoding.readVarUint(decoder2);
          for (let i = 0; i < len; i++) {
            const clientId = decoding.readVarUint(decoder2);
            clientIds.add(clientId);
          }
        }
        break;
      }
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(ws: WebSocket, yjsDoc: YjsDocument, roomName: string) {
    const { awareness, connections } = yjsDoc;

    // Remove awareness states for this connection
    const clientIds = connections.get(ws);
    if (clientIds) {
      clientIds.forEach((clientId) => {
        awarenessProtocol.removeAwarenessStates(awareness, [clientId], null);
      });
    }

    // Remove connection
    connections.delete(ws);

    this.logger.log(`Connection closed for room ${roomName}. Remaining: ${connections.size}`);

    // Clean up empty documents after a delay
    if (connections.size === 0) {
      setTimeout(() => {
        const currentDoc = this.documents.get(roomName);
        if (currentDoc && currentDoc.connections.size === 0) {
          currentDoc.doc.destroy();
          this.documents.delete(roomName);
          this.logger.log(`Cleaned up empty document for room ${roomName}`);
        }
      }, 30000); // 30 second delay before cleanup
    }
  }

  /**
   * Send message to WebSocket
   */
  private send(ws: WebSocket, message: Uint8Array) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }

  /**
   * Cleanup all resources
   */
  private cleanup() {
    this.documents.forEach((yjsDoc, roomName) => {
      yjsDoc.connections.forEach((_, ws) => {
        ws.close();
      });
      yjsDoc.doc.destroy();
      this.logger.log(`Cleaned up document for room ${roomName}`);
    });
    this.documents.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  /**
   * Get document content for persistence
   */
  getDocumentContent(roomName: string): Uint8Array | null {
    const yjsDoc = this.documents.get(roomName);
    if (!yjsDoc) return null;
    return Y.encodeStateAsUpdate(yjsDoc.doc);
  }

  /**
   * Load initial content into a document
   */
  loadDocumentContent(roomName: string, content: string) {
    const yjsDoc = this.getOrCreateDocument(roomName);
    const yText = yjsDoc.doc.getText('monaco');
    if (yText.length === 0 && content) {
      yjsDoc.doc.transact(() => {
        yText.insert(0, content);
      });
    }
  }
}
