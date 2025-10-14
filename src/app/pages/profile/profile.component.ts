import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['../auth/auth.component.css', './profile.component.css']
})
export class ProfileComponent {
  originalEmail = '';
  passwordExpanded = false;
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirm = '';
  message = '';
  success = '';

  ngOnInit() {
    const auth = JSON.parse(localStorage.getItem('auth_user') || 'null');
    if (!auth) return;
    const authEmail = (auth.email || '').toLowerCase();
    this.originalEmail = authEmail;
    // Load user details from mock/local
    (async () => {
      let mockUsers: any[] = [];
      try {
        const res = await fetch('/mock.json');
        const data = await res.json();
        mockUsers = data?.users || [];
      } catch {}
      const extra = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const users = [...extra, ...mockUsers];
      const u = users.find((x: any) => (x.email || '').toLowerCase() === authEmail);
      if (u) {
        this.firstName = u.firstName || '';
        this.lastName = u.lastName || '';
        this.email = u.email || '';
        this.phone = u.phone || '';
      } else {
        // fallback to minimal
        this.email = auth.email;
      }
    })();
  }

  togglePasswordSection(event?: Event) {
    event?.preventDefault();
    this.passwordExpanded = !this.passwordExpanded;
  }

  private isBlockedEmail(email: string) {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    return domain === 'gmail.com' || domain === 'yahoo.com';
  }

  private validPhoneE164(phone: string) {
    return /^\+[1-9]\d{7,14}$/.test(phone);
  }

  async save(evt: Event) {
    evt.preventDefault();
    this.message = '';
    this.success = '';

    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.message = 'First and last name are required';
      return;
    }
    const email = this.email.trim().toLowerCase();
    if (!email.includes('@')) {
      this.message = 'Valid email is required';
      return;
    }
    if (this.isBlockedEmail(email)) {
      this.message = 'Please use a work email (no gmail/yahoo)';
      return;
    }
    if (this.phone && !this.validPhoneE164(this.phone.trim())) {
      this.message = 'Enter phone with country code (e.g., +15551234567)';
      return;
    }
    if (this.password && (this.password.length < 6 || this.password !== this.confirm)) {
      this.message = 'Passwords must match and be at least 6 chars';
      return;
    }

    // Load current users
    let mockUsers: any[] = [];
    try {
      const res = await fetch('/mock.json');
      const data = await res.json();
      mockUsers = data?.users || [];
    } catch {}
    const extra: any[] = JSON.parse(localStorage.getItem('mock_users') || '[]');
    // Ensure email uniqueness (except for current)
    const combined = [...mockUsers, ...extra];
    const exists = combined.some(u => (u.email || '').toLowerCase() === email && (u.email || '').toLowerCase() !== this.originalEmail);
    if (exists) {
      this.message = 'Another account already uses this email';
      return;
    }

    // Update or insert into localStorage mock_users
    const updated = extra.filter(u => (u.email || '').toLowerCase() !== this.originalEmail);
    const newUser = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email,
      phone: (this.phone || '').trim(),
      password: this.password || (combined.find(u => (u.email || '').toLowerCase() === this.originalEmail)?.password || '')
    };
    updated.push(newUser);
    localStorage.setItem('mock_users', JSON.stringify(updated));

    // Update auth_user
    const name = `${newUser.firstName} ${newUser.lastName}`.trim();
    let existingAuth: any = null;
    try {
      existingAuth = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      existingAuth = null;
    }
    const updatedAuth = {
      ...(typeof existingAuth === 'object' && existingAuth ? existingAuth : {}),
      email: newUser.email,
      name,
    };
    localStorage.setItem('auth_user', JSON.stringify(updatedAuth));
    this.originalEmail = email;
    window.dispatchEvent(new CustomEvent('auth-changed'));
    this.success = 'Profile updated';
    this.password = '';
    this.confirm = '';
    this.passwordExpanded = false;
  }
}

