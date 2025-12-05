import { Injectable } from '@nestjs/common';

export interface Ripple {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  meta?: Record<string, any>;
  createdAt: string; // ISO string
}

@Injectable()
export class InsightsService {
  private ripples: Ripple[] = [];

  createRipple(ripple: Omit<Ripple, 'id' | 'createdAt'> & { id?: string }) {
    const r: Ripple = {
      id:
        ripple.id ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...ripple,
    };
    this.ripples.unshift(r);
    if (this.ripples.length > 1000) this.ripples.pop();
    return r;
  }

  getLatest(limit = 20) {
    return this.ripples.slice(0, limit);
  }
}
