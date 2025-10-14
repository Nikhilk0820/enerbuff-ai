import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { EventHistoryEntry, EventHistoryService } from '../../services/event-history.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit, OnDestroy {
  entries: EventHistoryEntry[] = [];
  user: { id?: number; email: string; name?: string } | null = null;
  loading = false;
  error = '';

  constructor(private history: EventHistoryService) {}

  ngOnInit() {
    this.refreshState();
    window.addEventListener('auth-changed', this.refreshState);
    window.addEventListener('storage', this.refreshState);
  }

  ngOnDestroy() {
    window.removeEventListener('auth-changed', this.refreshState);
    window.removeEventListener('storage', this.refreshState);
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  get hasEntries(): boolean {
    return this.entries.length > 0;
  }

  async refreshEntries() {
    if (!this.user) {
      this.entries = [];
      this.error = '';
      this.loading = false;
      return;
    }

    const userId = Number((this.user as any)?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      this.entries = [];
      this.error = '';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';
    try {
      this.entries = await this.history.getHistory(userId);
    } catch (err) {
      this.entries = [];
      this.error = this.extractError(err) || 'Failed to load event history. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private refreshState = () => {
    this.refreshUser();
    void this.refreshEntries();
  };

  private refreshUser() {
    try {
      this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      this.user = null;
    }
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body: any = err.error;
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (body?.message) return body.message;
      if (body?.error) return body.error;
      if (err.message) return err.message;
    }
    if (typeof err === 'object' && err && 'message' in err && typeof (err as any).message === 'string') {
      return (err as any).message;
    }
    return '';
  }
}
