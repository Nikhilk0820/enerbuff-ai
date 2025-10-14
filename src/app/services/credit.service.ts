import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { buildApiUrl } from '../utils/api-url';

interface CreditResponse {
  userId: number;
  credits: number;
}

@Injectable({ providedIn: 'root' })
export class CreditService {
  private readonly creditsSubject = new BehaviorSubject<number | null>(null);
  readonly credits$ = this.creditsSubject.asObservable();

  private lastUserId: number | null = null;

  constructor(private http: HttpClient) {}

  clear() {
    this.lastUserId = null;
    this.creditsSubject.next(null);
    this.broadcast(null);
  }

  async refresh(userId: number): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) {
      this.clear();
      return 0;
    }
    const token = this.requireToken();
    const credits = await this.fetchCredits(userId, token);
    this.setState(userId, credits);
    return credits;
  }

  async adjust(userId: number, delta: number): Promise<number> {
    const token = this.requireToken();
    if (!Number.isFinite(delta) || delta === 0) {
      return this.refresh(userId);
    }

    if (delta > 0) {
      await this.patch(userId, { amount: Math.round(delta) }, token);
      return this.refresh(userId);
    }

    const current = await this.ensureCurrent(userId);
    const deduction = Math.abs(Math.trunc(delta));
    if (current < deduction) {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    const next = current - deduction;
    await this.patch(userId, { credits: next }, token);
    return this.refresh(userId);
  }

  async set(userId: number, credits: number): Promise<number> {
    const token = this.requireToken();
    await this.patch(userId, { credits }, token);
    return this.refresh(userId);
  }

  private async ensureCurrent(userId: number): Promise<number> {
    if (this.lastUserId === userId) {
      const current = this.creditsSubject.value;
      if (typeof current === 'number' && !Number.isNaN(current)) {
        return current;
      }
    }
    return this.refresh(userId);
  }

  private async fetchCredits(userId: number, token: string): Promise<number> {
    try {
      const resp = await firstValueFrom(
        this.http.get<CreditResponse>(buildApiUrl(`users/${userId}/credits`), this.buildOptions(token))
      );
      const credits = resp?.credits;
      return typeof credits === 'number' && !Number.isNaN(credits) ? credits : 0;
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      if (status === 404 || status === 403) {
        this.clear();
      }
      throw err;
    }
  }

  private async patch(userId: number, body: { amount?: number; credits?: number }, token: string) {
    await firstValueFrom(
      this.http.patch(buildApiUrl(`users/${userId}/credits`), body, this.buildOptions(token))
    );
  }

  private setState(userId: number, credits: number) {
    this.lastUserId = userId;
    this.creditsSubject.next(credits);
    this.broadcast(credits);
  }

  private broadcast(balance: number | null) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('enercoin-changed', { detail: { balance } }));
    }
  }

  private getToken(): string | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (token && token.trim().length > 0) {
        return token;
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

  private buildOptions(token: string) {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }
}
