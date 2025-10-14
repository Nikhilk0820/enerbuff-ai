import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hero.component.html',
})
export class HeroComponent implements OnInit, OnDestroy {
  private user: { id?: number; email: string; name?: string } | null = null;

  ngOnInit() {
    this.refreshUser();
    window.addEventListener('auth-changed', this.refreshUser);
    window.addEventListener('storage', this.refreshUser);
  }

  ngOnDestroy() {
    window.removeEventListener('auth-changed', this.refreshUser);
    window.removeEventListener('storage', this.refreshUser);
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  private refreshUser = () => {
    try {
      this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      this.user = null;
    }
  };
}
