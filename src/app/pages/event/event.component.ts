import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DemoComponent } from '../../sections/demo/demo.component';
import { Demo1Component } from '../../sections/demo1/demo1.component';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, DemoComponent, Demo1Component],
  templateUrl: './event.component.html',
  styleUrl: './event.component.css',
})
export class EventComponent {
  horizon = 96;
  activeTab: 'demand' | 'droll' = 'demand';

  selectTab(tab: 'demand' | 'droll') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
  }
}
