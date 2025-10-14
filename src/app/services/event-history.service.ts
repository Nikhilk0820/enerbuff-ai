import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { buildApiUrl } from '../utils/api-url';

export type DemoEventType = 'Day-Ahead' | 'Intra-day' | 'Template';

export interface EventHistoryEntry {
  id: number;
  userId?: number;
  userName: string;
  action: string;
  eventType: DemoEventType;
  triggeredAt: string;
  enerCoinsUsed: number;
}

interface HistoryListResponse {
  entries?: any[];
  data?: any[];
}

@Injectable({ providedIn: 'root' })
export class EventHistoryService {
  private readonly historyEndpoint = buildApiUrl('events/history');

  constructor(private http: HttpClient) {}

  async getHistory(userId?: number): Promise<EventHistoryEntry[]> {
    const token = this.requireToken();
    const query = new URLSearchParams();
    if (typeof userId === 'number' && Number.isInteger(userId) && userId > 0) {
      query.set('userId', String(userId));
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const url = `${this.historyEndpoint}${suffix}`;

    try {
      const response = await firstValueFrom(
        this.http.get<HistoryListResponse | any[]>(url, this.buildOptions(token))
      );
      const rawEntries = Array.isArray(response)
        ? response
        : Array.isArray(response?.entries)
        ? response.entries
        : Array.isArray(response?.data)
        ? response.data
        : [];
      return rawEntries.map((entry) => this.normalizeEntry(entry));
    } catch (err) {
      this.handleHttpError(err);
      throw err;
    }
  }

  async logEvent(
    action: string,
    eventType: DemoEventType,
    user?: { id?: number; email: string; name?: string | null },
    enerCoinsUsed: number = 0,
  ): Promise<void> {
    const token = this.getToken();
    if (!token) {
      return;
    }
    const userId = Number((user as any)?.id);
    const payload = {
      userId: Number.isInteger(userId) && userId > 0 ? userId : undefined,
      userName: this.resolveUserName(user?.name || user?.email),
      action,
      eventType,
      enerCoinsUsed: this.resolveEnerCoinsUsed(enerCoinsUsed),
    };

    try {
      await firstValueFrom(
        this.http.post(this.historyEndpoint, payload, this.buildOptions(token))
      );
    } catch (err) {
      this.handleHttpError(err);
      // Do not rethrow to avoid interrupting user flow on logging failures
    }
  }

  private normalizeEntry(entry: any): EventHistoryEntry {
    const id = Number(entry?.id) || Date.now();
    const userId = Number(entry?.userId);
    const triggeredAtRaw = typeof entry?.triggeredAt === 'string' ? entry.triggeredAt : new Date().toISOString();
    const triggeredAt = new Date(triggeredAtRaw).toISOString();

    return {
      id,
      userId: Number.isInteger(userId) && userId > 0 ? userId : undefined,
      userName: this.resolveUserName(entry?.userName || entry?.user_email || entry?.email),
      action: typeof entry?.action === 'string' ? entry.action : 'Event',
      eventType: this.resolveEventType(entry?.eventType || entry?.type),
      triggeredAt,
      enerCoinsUsed: this.resolveEnerCoinsUsed(entry?.enerCoinsUsed ?? entry?.creditsUsed),
    };
  }

  private resolveUserName(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    return 'Unknown User';
  }

  private resolveEventType(value: unknown): DemoEventType {
    if (value === 'Intra-day') return 'Intra-day';
    if (value === 'Template') return 'Template';
    return 'Day-Ahead';
  }

  private resolveEnerCoinsUsed(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed);
    }
    return 0;
  }

  private buildOptions(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  private getToken(): string | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (token && token.trim().length > 0) {
        return token.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  private requireToken(): string {
    const token = this.getToken();
    if (!token) {
      throw new Error('Missing auth token');
    }
    return token;
  }

  private handleHttpError(err: any) {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      console.warn('Unauthorized when accessing event history APIs');
    }
  }
}
