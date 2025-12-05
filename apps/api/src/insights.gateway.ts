// apps/api/src/insights.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InsightsService, Ripple } from './insights.service';
import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, MaxLength, validateSync } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';

/**
 * DTO for incoming ripple emission.
 */
class EmitRippleDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  meta?: Record<string, any>;
}

@WebSocketGateway({
  namespace: '/insights',
  cors: {
    origin: '*', // tighten to your domains before production
    methods: ['GET', 'POST'],
    credentials: false,
  },
})
export class InsightsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InsightsGateway.name);

  constructor(private readonly insightsService: InsightsService) {}

  // -----------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------
  afterInit(server: Server) {
    this.logger.log('InsightsGateway initialized (namespace: /insights)');
  }

  handleConnection(client: Socket) {
    try {
      // ---- Anonymous auth -------------------------------------------------
      // Accept username via query, header, or handshake.auth payload.
      const q = client.handshake.query ?? {};
      const auth = (client.handshake as any).auth ?? {};

      const suppliedName =
        (auth && auth.username) ||
        (q && (q['username'] as string)) ||
        client.handshake.headers['x-username'] ||
        null;

      const suppliedId = (auth && auth.id) || (q && (q['id'] as string)) || null;
      const generatedId = suppliedId ?? uuidv4();

      const displayName =
        typeof suppliedName === 'string' && suppliedName.trim().length > 0
          ? suppliedName.trim()
          : `anon-${generatedId.slice(0, 8)}`;

      // Store minimal user data on the socket for later use
      client.data.user = {
        id: generatedId,
        name: displayName,
      };

      this.logger.log(
        `Client connected: socketId=${client.id} userId=${generatedId} name=${displayName}`,
      );

      // Join a global room – useful for broadcasting to all participants
      client.join('global');

      // Send a welcome packet with a snapshot of recent ripples
      client.emit('handshake:welcome', {
        ok: true,
        namespace: '/insights',
        user: client.data.user,
        serverTime: new Date().toISOString(),
        latest: this.insightsService.getLatest(20),
      });

      // Notify others of the new presence
      client.to('global').emit('presence:join', {
        user: client.data.user,
        at: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Error during handleConnection', err);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user ?? { id: 'unknown', name: 'unknown' };
    this.logger.log(
      `Client disconnected: socketId=${client.id} userId=${user.id} name=${user.name}`,
    );
    client.to('global').emit('presence:left', {
      user,
      at: new Date().toISOString(),
    });
  }

  // -----------------------------------------------------------------
  // Message handlers
  // -----------------------------------------------------------------
  /**
   * Client emits 'ripple:emit' with { content, meta? }.
   * Server validates, stores (in‑memory for now), and broadcasts.
   */
  @SubscribeMessage('ripple:emit')
  async handleRippleEmit(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    // ----- Validation ----------------------------------------------------
    const dto = plainToInstance(EmitRippleDto, payload ?? {});
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: false });

    if (errors.length > 0) {
      const msg = errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join(' | ');
      this.logger.warn(`Ripple validation failed from ${client.id}: ${msg}`);
      client.emit('ripple:error', { ok: false, error: 'validation', message: msg });
      return { ok: false, error: 'validation', message: msg };
    }

    // ----- Build ripple ---------------------------------------------------
    const user = client.data?.user ?? { id: 'anon', name: 'anon' };
    const ripple: Omit<Ripple, 'id' | 'createdAt'> & { id?: string } = {
      authorId: user.id,
      authorName: user.name,
      content: dto.content,
      meta: dto.meta ?? {},
    };

    const created = this.insightsService.createRipple(ripple);

    // ----- Broadcast to everyone in the global room ----------------------
    this.server.to('global').emit('ripple:broadcast', {
      ok: true,
      ripple: created,
    });

    this.logger.log(
      `Ripple emitted: userId=${user.id} rippleId=${created.id.slice(0, 8)} len=${created.content.length}`,
    );

    // ----- Ack back to the sender ----------------------------------------
    client.emit('ripple:ack', { ok: true, ripple: created });
    return { ok: true };
  }

  /**
   * Optional: client can request the latest N ripples.
   */
  @SubscribeMessage('ripple:fetchLatest')
  handleFetchLatest(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    const limit =
      typeof body === 'object' && body?.limit ? Number(body.limit) : 20;
    const latest = this.insightsService.getLatest(
      Math.min(100, Math.max(1, limit)),
    );
    client.emit('ripple:latest', { ok: true, latest });
    return { ok: true };
  }
}
