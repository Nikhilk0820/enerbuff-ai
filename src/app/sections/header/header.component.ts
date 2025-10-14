import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CreditService } from '../../services/credit.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  user: { id?: number; email: string; name?: string; enerCoins?: number; credits?: number } | null = null;
  enerCoinBalance = 0;
  menuOpen = false;
  isEventPage = false;
  isHistoryPage = false;

  private routerSub?: Subscription;
  private creditSub?: Subscription;
  private currentUrl = '';
  private pendingFragment: string | null | undefined;
  private lastSyncedUserId: number | null = null;
  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private readonly inactivityDurationMs = 60 * 60 * 1000;
  private readonly activityEvents: Array<keyof DocumentEventMap> = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove'];
  private readonly handleActivity = () => this.resetInactivityTimer();

  constructor(private router: Router, private credits: CreditService) {}

  ngOnInit() {
    this.refreshUser();
    window.addEventListener('auth-changed', this.refreshUser);
    window.addEventListener('storage', this.refreshUser);
    window.addEventListener('click', this.handleDocClick);
    this.activityEvents.forEach((event) => window.addEventListener(event, this.handleActivity, true));

    this.creditSub = this.credits.credits$.subscribe((value) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        this.enerCoinBalance = value;
      } else {
        this.enerCoinBalance = 0;
      }
    });

    this.updateRouteState(this.router.url);
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateRouteState(event.urlAfterRedirects);
        if (this.isLandingUrl(this.currentUrl) && this.pendingFragment !== undefined) {
          const fragment = this.pendingFragment;
          this.pendingFragment = undefined;
          requestAnimationFrame(() => this.scrollToFragment(fragment));
        }
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('auth-changed', this.refreshUser);
    window.removeEventListener('storage', this.refreshUser);
    window.removeEventListener('click', this.handleDocClick);
    this.activityEvents.forEach((event) => window.removeEventListener(event, this.handleActivity, true));
    this.clearInactivityTimer();
    this.routerSub?.unsubscribe();
    this.creditSub?.unsubscribe();
  }

  refreshUser = () => {
    try {
      this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      this.user = null;
    }
    this.syncCredits();

    if (this.user) {
      this.resetInactivityTimer();
    } else {
      this.menuOpen = false;
      this.clearInactivityTimer();
    }
  };

  logout(event?: Event) {
    event?.stopPropagation();
    this.clearInactivityTimer();
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    this.credits.clear();
    this.enerCoinBalance = 0;
    this.lastSyncedUserId = null;
    this.menuOpen = false;
    window.dispatchEvent(new CustomEvent('auth-changed'));
    this.router.navigateByUrl('/');
  }

  toggleMenu(event?: Event) {
    event?.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(event?: Event) {
    event?.stopPropagation();
    this.menuOpen = false;
  }

  navigateTo(fragment?: string, event?: Event) {
    event?.preventDefault();
    this.menuOpen = false;
    this.pendingFragment = fragment ?? null;

    if (!this.isLandingUrl(this.currentUrl)) {
      // Navigate back to landing and scroll once navigation completes
      this.router.navigate(['/'], fragment ? { fragment } : undefined).then((succeeded) => {
        if (succeeded && fragment === undefined) {
          // Scroll to top after navigation if no target fragment
          requestAnimationFrame(() => this.scrollToFragment(null));
        }
      });
      return;
    }

    // Already on landing page - scroll immediately
    this.pendingFragment = undefined;
    this.scrollToFragment(fragment ?? null);
  }

  goToEvent(event?: Event) {
    event?.preventDefault();
    this.menuOpen = false;
    if (this.currentUrl.startsWith('/event')) {
      return;
    }
    this.pendingFragment = undefined;
    this.router.navigate(['/event']);
  }

  goToHistory(event?: Event) {
    event?.preventDefault();
    this.menuOpen = false;
    if (this.currentUrl.startsWith('/history')) {
      return;
    }
    this.pendingFragment = undefined;
    this.router.navigate(['/history']);
  }

  handleDocClick = () => {
    this.menuOpen = false;
  };

  private resetInactivityTimer() {
    if (!this.user) {
      this.clearInactivityTimer();
      return;
    }
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.inactivityDurationMs);
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  private syncCredits() {
    const userId = Number((this.user as any)?.id);
    if (Number.isInteger(userId) && userId > 0) {
      if (this.lastSyncedUserId !== userId) {
        this.lastSyncedUserId = userId;
        this.credits.refresh(userId).catch(() => {
          this.enerCoinBalance = 0;
        });
      }
    } else {
      this.enerCoinBalance = 0;
      this.credits.clear();
      this.lastSyncedUserId = null;
    }
  }

  private updateRouteState(url: string) {
    this.currentUrl = url;
    this.isEventPage = url.startsWith('/event') || url.startsWith('/history');
    this.isHistoryPage = url.startsWith('/history');
  }

  private isLandingUrl(url: string): boolean {
    return url === '/' || url.startsWith('/#') || url === '';
  }

  private scrollToFragment(fragment: string | null) {
    if (fragment === null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.getElementById(fragment) || document.querySelector(`[data-anchor="${fragment}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

