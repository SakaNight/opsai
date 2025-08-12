
import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  mongoState() {
    // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
    const readyState = this.conn.readyState;
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return { code: readyState, state: states[readyState] ?? 'unknown' };
  }
}