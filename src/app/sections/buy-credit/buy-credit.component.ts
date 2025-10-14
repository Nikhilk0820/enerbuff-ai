import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CreditService } from '../../services/credit.service';

@Component({
  selector: 'app-buy-credit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buy-credit.component.html',
})
export class BuyCreditComponent {
  balance = 0;
  readonly pricePerCredit = 50;
  readonly packages = [50, 100, 250, 500, 1000];
  selectedCredits = this.packages[0];
  isAuthenticated = false;
  checkoutProcessing = false;
  feedback: { message: string; tone: 'success' | 'error' } | null = null;

  private creditSub?: Subscription;
  private routeSub?: Subscription;
  private userId: number | null = null;
  private readonly phonePeBaseUrl = 'https://mercury.phonepe.com/transact';
  // TODO: Replace with the real PhonePe merchant ID once it is issued.
  private readonly placeholderMerchantId = 'REPLACE_WITH_PHONEPE_MERCHANT_ID';

  constructor(
    private credits: CreditService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.syncBalance();
    window.addEventListener('auth-changed', this.syncBalance);
    window.addEventListener('storage', this.syncBalance);

    this.creditSub = this.credits.credits$.subscribe((value) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        this.balance = value;
      } else {
        this.balance = 0;
      }
    });

    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const status = params.get('payment_status');
      if (!status) {
        return;
      }

      const creditsRaw = params.get('credits');
      const creditsParam = creditsRaw !== null ? Number(creditsRaw) : NaN;
      const creditsToAdd = Number.isFinite(creditsParam) ? Math.trunc(creditsParam) : NaN;
      const orderId = params.get('order_id') || undefined;

      if (status === 'success' && Number.isFinite(creditsToAdd) && creditsToAdd > 0) {
        this.selectedCredits = creditsToAdd;
        void this.handleSuccessfulPurchase(creditsToAdd, orderId);
      } else if (status === 'cancelled' || status === 'failed') {
        this.setFeedback('Payment was not completed. No EnerCoins have been added.', 'error');
      } else {
        this.setFeedback('We could not verify the payment status. Please contact support.', 'error');
      }

      void this.clearPaymentParams();
    });
  }

  ngOnDestroy() {
    window.removeEventListener('auth-changed', this.syncBalance);
    window.removeEventListener('storage', this.syncBalance);
    this.creditSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  syncBalance = () => {
    let parsedUser: any = null;
    try {
      parsedUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      parsedUser = null;
    }

    const userId = Number(parsedUser?.id);
    if (Number.isInteger(userId) && userId > 0) {
      this.isAuthenticated = true;
      this.userId = userId;
      this.credits.refresh(userId).catch(() => {
        this.balance = 0;
      });
    } else {
      this.balance = 0;
      this.credits.clear();
      this.isAuthenticated = false;
      this.userId = null;
    }
  };

  get subtotal(): number {
    return this.selectedCredits * this.pricePerCredit;
  }

  get total(): number {
    return this.subtotal;
  }

  selectPackage(credits: number) {
    this.selectedCredits = credits;
  }

  checkout() {
    if (!this.isAuthenticated || this.checkoutProcessing) {
      return;
    }

    if (typeof window === 'undefined') {
      this.setFeedback('Checkout is not available in this environment.', 'error');
      return;
    }

    this.feedback = null;
    this.checkoutProcessing = true;

    let redirected = false;
    try {
      const orderId = `EB-${Date.now()}`;
      const amountInPaise = Math.round(this.subtotal * 100);
      const successUrl = this.buildReturnUrl('success', orderId, this.selectedCredits);
      const failureUrl = this.buildReturnUrl('cancelled', orderId, this.selectedCredits);
      if (this.placeholderMerchantId.startsWith('REPLACE')) {
        console.warn(
          '[BuyCreditComponent] PhonePe merchant ID is still using the placeholder. Update it before going live.'
        );
      }
      const checkoutUrl = this.buildPhonePeUrl({
        amountInPaise,
        orderId,
        successUrl,
        failureUrl,
      });

      window.location.href = checkoutUrl;
      redirected = true;
    } catch (err) {
      console.error('Failed to start PhonePe checkout', err);
      this.setFeedback('Unable to start checkout. Please try again.', 'error');
    } finally {
      if (!redirected) {
        this.checkoutProcessing = false;
      }
    }
  }

  private async handleSuccessfulPurchase(credits: number, orderId?: string) {
    if (!this.userId) {
      this.setFeedback(
        'Payment succeeded but no user is associated with this session. Please log in again.',
        'error'
      );
      return;
    }

    try {
      await this.credits.adjust(this.userId, credits);
      this.setFeedback(
        `Payment successful${orderId ? ` (ref ${orderId})` : ''}! ${credits} EnerCoins have been added to your balance.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to update credits after payment', err);
      this.setFeedback(
        'Payment succeeded, but we could not refresh your EnerCoin balance automatically. Please refresh the page or contact support.',
        'error'
      );
    }
  }

  private setFeedback(message: string, tone: 'success' | 'error') {
    this.feedback = { message, tone };
  }

  private buildReturnUrl(
    status: 'success' | 'cancelled' | 'failed',
    orderId: string,
    credits: number
  ): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const url = new URL(window.location.href);
    url.searchParams.set('payment_status', status);
    url.searchParams.set('order_id', orderId);
    if (status === 'success') {
      url.searchParams.set('credits', String(credits));
    } else {
      url.searchParams.delete('credits');
    }
    return url.toString();
  }

  private buildPhonePeUrl(config: {
    amountInPaise: number;
    orderId: string;
    successUrl: string;
    failureUrl: string;
  }): string {
    const params = new URLSearchParams({
      merchantId: this.placeholderMerchantId,
      transactionId: config.orderId,
      amount: String(config.amountInPaise),
      redirectUrl: config.successUrl,
      cancelUrl: config.failureUrl,
    });
    return `${this.phonePeBaseUrl}?${params.toString()}`;
  }

  private async clearPaymentParams() {
    try {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          payment_status: null,
          credits: null,
          order_id: null,
        },
        replaceUrl: true,
      });
    } catch (err) {
      console.warn('Failed to clear payment query params', err);
    }
  }
}
