import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuyCreditComponent } from '../../sections/buy-credit/buy-credit.component';

@Component({
  selector: 'app-buy-credit-page',
  standalone: true,
  imports: [CommonModule, BuyCreditComponent],
  templateUrl: './buy-credit.page.html',
})
export class BuyCreditPageComponent {}
