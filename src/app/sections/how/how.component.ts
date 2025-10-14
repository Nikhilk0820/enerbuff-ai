import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-how',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how.component.html',
  styleUrls: ['./how.component.css'],
})
export class HowComponent {
  showAllSteps = false;

  readonly sections = [
    {
      title: 'ISTS Drawal Forecast',
      items: [
        'AI-Trained for Your State - ENERBUFF AI is powered by models pre-trained on the latest State SEM Drawal data, delivering accuracy you can trust from day one.',
        'Effortless Data Onboarding - Simply upload your historical ISTS Drawal data using our ready-to-use template, no complex setup required.',
        'Day-Ahead Forecasts in Seconds - Generate precise day-ahead ISTS dependency forecasts instantly for your state, empowering faster, data-driven decisions.',
        'Real-Time Intra-Day Insights - Upload the latest block-wise ISTS Drawal data to update forecasts on the fly and stay ahead of demand shifts.'
      ],
    },
    {
      title: "State's Demand Forecast",
      items: [
        "Train in Just 24 Hours - ENERBUFF AI quickly learns your state's unique demand patterns, with models trained within 24 hours for high accuracy and reliability.",
        'Seamless Data Upload - For first-time users, simply upload actual historical data using our ready-to-use template, including internal generation (from April 2024 onward) and ISTS Drawal records.',
        'Instant Day-Ahead Forecasts - Once trained, generate precise day-ahead demand forecasts instantly, enabling smarter scheduling and procurement decisions.',
        'Real-Time Intra-Day Updates - Keep forecasts continuously accurate by uploading the latest block-wise ISTS Drawal and internal generation data to stay ahead of every demand shift.',
      ],
    },
  ];

  get hasHiddenItems(): boolean {
    return this.sections.some((section) => section.items.length > 2);
  }

  toggleSteps(): void {
    this.showAllSteps = !this.showAllSteps;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
