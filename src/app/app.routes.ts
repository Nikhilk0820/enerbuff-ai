import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AuthComponent } from './pages/auth/auth.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { EventComponent } from './pages/event/event.component';
import { HistoryComponent } from './pages/history/history.component';
import { BuyCreditPageComponent } from './pages/buy-credit/buy-credit.page';
import { LegalComponent } from './pages/legal/legal.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', redirectTo: 'auth' },
  { path: 'register', redirectTo: 'auth' },
  { path: 'auth', component: AuthComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'demo', redirectTo: 'event', pathMatch: 'full' },
  { path: 'event', component: EventComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'buy-credit', component: BuyCreditPageComponent },
  { path: 'legal', redirectTo: 'legal/terms', pathMatch: 'full' },
  { path: 'legal/:slug', component: LegalComponent },
  { path: '**', redirectTo: '' },
];

