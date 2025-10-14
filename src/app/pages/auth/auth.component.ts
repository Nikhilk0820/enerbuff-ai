import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreditService } from '../../services/credit.service';
import { buildApiUrl } from '../../utils/api-url';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  tab: 'login' | 'register' = 'login';

  // Login fields
  lEmail = '';
  lPassword = '';
  lMessage = '';

  // Register fields
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirm = '';
  state = '';
  rMessage = '';

  states: string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  constructor(private router: Router, private http: HttpClient, private credits: CreditService) {}

  private validPhone(phone: string) {
    // Require exactly 10 digits (Indian mobile format without country code)
    return /^\d{10}$/.test(phone);
  }

  private extractError(err: any): string {
    if (!err) return '';
    if (err instanceof HttpErrorResponse) {
      const body: any = err.error;
      return (
        (typeof body === 'string' && body) ||
        body?.message ||
        body?.error ||
        err.message ||
        ''
      );
    }
    try {
      return err?.message || '';
    } catch {
      return '';
    }
  }

  async onLogin(evt: Event) {
    evt.preventDefault();
    this.lMessage = '';

    const email = this.lEmail.trim().toLowerCase();
    const password = this.lPassword;
    if (!email || !password) {
      this.lMessage = 'Email and password are required';
      return;
    }

    try {
      const resp: any = await firstValueFrom(
        this.http.post(buildApiUrl('login'), {
          email,
          password
        })
      );

      const respUser = resp?.user ?? resp ?? {};
      const firstName = (resp?.firstName ?? respUser?.firstName ?? '').trim();
      const lastName = (resp?.lastName ?? respUser?.lastName ?? '').trim();
      const rawName = (resp?.name ?? `${firstName} ${lastName}`).trim();
      const name = rawName || email;
      const userEmail = (resp?.email ?? respUser?.email ?? email)?.trim() || email;

      const rawCredits = typeof resp?.credits === 'number' ? resp.credits : typeof respUser?.credits === 'number' ? respUser.credits : undefined;
      const rawEnerCoins = typeof resp?.enerCoins === 'number' ? resp.enerCoins : typeof respUser?.enerCoins === 'number' ? respUser.enerCoins : undefined;
      const balance = typeof rawEnerCoins === 'number' ? rawEnerCoins : rawCredits;

      const authUser = {
        email: userEmail,
        name,
        id: resp?.id ?? respUser?.id,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobile: resp?.mobile ?? respUser?.mobile ?? undefined,
        state: resp?.state ?? respUser?.state ?? undefined,
        credits: typeof rawCredits === 'number' ? rawCredits : balance,
        enerCoins: typeof rawEnerCoins === 'number' ? rawEnerCoins : undefined,
      };

      localStorage.setItem('auth_user', JSON.stringify(authUser));
      const token = this.extractToken(resp);
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }

      if (Number.isInteger(authUser.id)) {
        try {
          const latest = await this.credits.refresh(authUser.id);
          authUser.credits = latest;
          authUser.enerCoins = latest;
          localStorage.setItem('auth_user', JSON.stringify(authUser));
        } catch {}
      } else {
        this.credits.clear();
      }

      window.dispatchEvent(new CustomEvent('auth-changed'));
      this.router.navigateByUrl('/');
    } catch (err) {
      this.lMessage = this.extractError(err) || 'Login failed. Please try again.';
    }
  }

  async onRegister(evt: Event) {
    evt.preventDefault();
    this.rMessage = '';

    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.rMessage = 'First and last name are required';
      return;
    }
    const email = this.email.trim().toLowerCase();
    if (!email.includes('@')) {
      this.rMessage = 'Valid email is required';
      return;
    }
    if (!this.validPhone(this.phone.trim())) {
      this.rMessage = 'Enter a 10-digit mobile number';
      return;
    }
    if (!this.state) {
      this.rMessage = 'Please select your state';
      return;
    }
    if (!this.password || this.password.length < 8 || this.password !== this.confirm) {
      this.rMessage = 'Passwords must match and be at least 8 chars';
      return;
    }

    try {
      const payload = {
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email,
        mobile: this.phone.trim(),
        state: this.state,
        password: this.password
      };
      const resp: any = await firstValueFrom(
        this.http.post(buildApiUrl('register'), payload)
      );

      const respUser = resp?.user ?? resp ?? {};
      const firstName = (resp?.firstName ?? respUser?.firstName ?? this.firstName).trim();
      const lastName = (resp?.lastName ?? respUser?.lastName ?? this.lastName).trim();
      const rawName = (resp?.name ?? `${firstName} ${lastName}`).trim();
      const name = rawName || email;
      const userEmail = (resp?.email ?? respUser?.email ?? email)?.trim() || email;

      const rawCredits = typeof resp?.credits === 'number' ? resp.credits : typeof respUser?.credits === 'number' ? respUser.credits : undefined;
      const rawEnerCoins = typeof resp?.enerCoins === 'number' ? resp.enerCoins : typeof respUser?.enerCoins === 'number' ? respUser.enerCoins : undefined;
      const balance = typeof rawEnerCoins === 'number' ? rawEnerCoins : rawCredits;

      const authUser = {
        email: userEmail,
        name,
        id: resp?.id ?? respUser?.id,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobile: resp?.mobile ?? respUser?.mobile ?? undefined,
        state: (resp?.state ?? respUser?.state ?? this.state) || undefined,
        credits: typeof rawCredits === 'number' ? rawCredits : balance,
        enerCoins: typeof rawEnerCoins === 'number' ? rawEnerCoins : undefined,
      };

      localStorage.setItem('auth_user', JSON.stringify(authUser));
      const token = this.extractToken(resp);
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }

      if (Number.isInteger(authUser.id)) {
        try {
          const latest = await this.credits.refresh(authUser.id);
          authUser.credits = latest;
          authUser.enerCoins = latest;
          localStorage.setItem('auth_user', JSON.stringify(authUser));
        } catch {}
      } else {
        this.credits.clear();
      }

      window.dispatchEvent(new CustomEvent('auth-changed'));
      this.router.navigateByUrl('/');
    } catch (err) {
      this.rMessage = this.extractError(err) || 'Registration failed. Please try again.';
    }
  }

  private extractToken(resp: any): string | null {
    if (!resp) return null;
    const candidates = [
      resp.token,
      resp.accessToken,
      resp.access_token,
      resp.jwt,
      resp?.data?.token,
      resp?.user?.token,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return null;
  }
}
