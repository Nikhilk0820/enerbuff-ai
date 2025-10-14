import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroComponent } from '../../sections/hero/hero.component';
import { HowComponent } from '../../sections/how/how.component';
import { FeaturesComponent } from '../../sections/features/features.component';
import { FaqComponent } from '../../sections/faq/faq.component';
import { BuyCreditComponent } from '../../sections/buy-credit/buy-credit.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeroComponent,
    HowComponent,
    FeaturesComponent,
    BuyCreditComponent,
    FaqComponent,
  ],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  horizon = 96;
}

