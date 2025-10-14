import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html',
})
export class FaqComponent {
  faq = [
    { q: "What is ENERBUFF AI?", a: 'ENERBUFF AI is an AI-powered demand forecasting and decisionmaking platform for the power sector. It helps state utilities, DISCOMs, and SLDCs generate dayahead and intra-day demand forecasts and predict ISTS dependency with high accuracy — enabling smarter, data-driven grid operations.', open: false },
    { q: 'How often can I update forecasts?', a: 'Users can update intra-day forecasts anytime by uploading the latest block-wise ISTS Drawal and internal generation data. This ensures real-time demand prediction accuracy and better responsiveness to load variations.', open: false },
    { q: 'Is ENERBUFF AI compliant with power sector regulations?', a: 'Yes. ENERBUFF AI follows CEA and CERC forecasting guidelines and is designed to support regulatory compliance for state utilities, SLDCs, and power planners. Every forecast is auditable and traceable to meet compliance standards.', open: false },
    { q: 'How accurate are ENERBUFF AI forecasts?', a: 'ENERBUFF AI uses machine learning and adaptive models to deliver high-accuracy power demand forecasts. The platform continuously improves predictions and offers Advanced Forecasting Mode for even greater precision.', open: false },
    { q: 'Is ENERBUFF AI easy to use for utilities?', a: 'Yes. The platform is built for ease of use with a clean, guided interface, automated data templates, and instant forecast generation — no technical expertise or coding required.', open: false },
    { q: 'Can ENERBUFF AI integrate with existing utility systems?', a: 'ENERBUFF AI supports integration with SLDC, SCADA, and energy management systems, enabling utilities to unify their forecasting, scheduling, and operational workflows for smarter grid management.', open: false },
    { q: 'How is EnerCoin used for each forecast?', a: 'Each time you generate a forecast using ENERBUFF AI, a few EnerCoins are used. EnerCoins are the platform’s digital credits that let you run dayahead or intra-day forecasts. This pay-per-use system helps utilities control costs while getting accurate, real-time forecasts whenever they need them.', open: false },
    { q: 'How can I purchase EnerCoins?', a: 'You can easily purchase EnerCoins directly from your ENERBUFF AI dashboard. Go to the “EnerCoin Wallet” section, choose the number of coins you need, and complete the payment through the available online payment options. Once the transaction is successful, the EnerCoins will be instantly added to your account balance — ready to use for generating forecasts.', open: false }
  ];

  toggleFaq(i: number) { this.faq[i].open = !this.faq[i].open; }
}
