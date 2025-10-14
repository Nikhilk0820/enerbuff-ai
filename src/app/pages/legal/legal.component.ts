import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalPolicy {
  slug: string;
  title: string;
  subtitle: string;
  updatedOn: string;
  chipLabel: string;
  description: string;
  sections: LegalSection[];
}

const POLICY_DATA: LegalPolicy[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    subtitle: 'Using EnerBuff AI responsibly',
    updatedOn: '1 October 2025',
    chipLabel: 'Usage',
    description:
      'These terms describe how you can access the EnerBuff AI platform, how subscriptions work, and the shared responsibilities that keep forecasts accurate and reliable.',
    sections: [
      {
        title: 'Access & eligibility',
        paragraphs: [
          'EnerBuff AI is licensed to utilities and partners that hold an active subscription or purchase order. By creating an account you confirm that you are authorised to act on behalf of your organisation.',
        ],
        bullets: [
          'Keep your login credentials confidential and unique.',
          'Do not attempt to probe or reverse engineer proprietary models.',
          'Notify EnerBuff Support within 24 hours if you suspect unauthorised access.',
        ],
      },
      {
        title: 'Platform usage',
        paragraphs: [
          'Forecast outputs are generated from customer-supplied signal data blended with EnerBuff proprietary datasets. You are responsible for validating whether the forecasts are fit for a specific operational decision.',
        ],
        bullets: [
          'Only upload data that you have the right to share.',
          'Respect rate limits communicated inside the console and APIs.',
          'Do not resell EnerBuff outputs without a separate resale addendum.',
        ],
      },
      {
        title: 'Subscription & billing',
        paragraphs: [
          'Plans renew automatically until cancelled. Downgrades take effect at the next billing cycle. EnerBuff may suspend service for invoices that remain unpaid for more than 15 calendar days.',
        ],
        bullets: [
          'Monthly subscriptions are billed upfront.',
          'Usage beyond committed credits is charged at the pay-as-you-go rate.',
          'Enterprise MSAs prevail over these terms where conflicts exist.',
        ],
      },
      {
        title: 'Liability',
        paragraphs: [
          'EnerBuff provides the platform “as is” and disclaims implied warranties to the maximum extent permitted by law. Our aggregate liability is capped at the fees paid in the preceding three months.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Protecting operational intelligence',
    updatedOn: '4 October 2025',
    chipLabel: 'Data',
    description:
      'EnerBuff combines enterprise-grade security controls with transparent data practices so that utilities retain ownership of the telemetry and forecasts they entrust to us.',
    sections: [
      {
        title: 'Data ownership & use',
        paragraphs: [
          'You always own the raw datasets, model configurations, and outputs that pass through EnerBuff AI. We only process your data to deliver contracted services, improve core forecasting quality, or comply with legal requirements.',
        ],
        bullets: [
          'No customer payloads are used to train public models.',
          'Aggregated learnings are anonymised before benchmarking.',
        ],
      },
      {
        title: 'Security controls',
        paragraphs: [
          'EnerBuff infrastructure runs on ISO 27001 certified providers with network segregation between staging and production. Access to live clusters requires hardware-backed MFA and is logged centrally.',
        ],
        bullets: [
          'Data in transit is encrypted with TLS 1.3; at rest with AES-256.',
          'Backups replicate across two regions with 30-day retention.',
          'Penetration tests are performed twice yearly by accredited vendors.',
        ],
      },
      {
        title: 'Data retention & deletion',
        paragraphs: [
          'Operational data is retained for 180 days after contract termination unless you request deletion sooner. Audit logs may be kept longer when mandated by regulation or tax law.',
        ],
        bullets: [
          'You can request export or purge by emailing support_ai@enerbuff.com.',
          'Deletion is confirmed in writing within 10 business days.',
        ],
      },
      {
        title: 'Incident response',
        paragraphs: [
          'If EnerBuff becomes aware of a security incident that impacts your data, we will notify the nominated security contact within 24 hours together with remediation steps and interim safeguards.',
        ],
      },
    ],
  },
  {
    slug: 'refunds',
    title: 'Refund & Credit Policy',
    subtitle: 'Transparent billing for mission-critical teams',
    updatedOn: '6 October 2025',
    chipLabel: 'Billing',
    description:
      'We aim to resolve billing issues quickly while balancing the cost of running dedicated forecasting infrastructure at scale.',
    sections: [
      {
        title: 'Eligibility',
        paragraphs: [
          'Refunds are evaluated for duplicate charges, accidental top-ups, or sustained service interruptions attributable to EnerBuff infrastructure.',
        ],
        bullets: [
          'Requests must be lodged within 15 days of the invoice date.',
          'Usage-based fees already consumed are non-refundable.',
        ],
      },
      {
        title: 'Process',
        paragraphs: [
          'Submit the purchase reference, charge description, and supporting screenshots to support_ai@enerbuff.com. The finance desk responds within two business days.',
        ],
        bullets: [
          'Valid claims are refunded to the original payment method.',
          'Enterprise customers may opt for service credits applied to the next cycle.',
        ],
      },
      {
        title: 'Service credits',
        paragraphs: [
          'If EnerBuff misses an availability commitment defined in your SLA, we automatically credit the affected account during the next billing run.',
        ],
      },
      {
        title: 'Non-refundable items',
        paragraphs: [
          'One-time onboarding fees, third-party data pass-through charges, and bank transfer costs are not refundable because they are incurred upfront on your behalf.',
        ],
      },
    ],
  },
];

const POLICY_LOOKUP = POLICY_DATA.reduce<Record<string, LegalPolicy>>(
  (acc, policy) => {
    acc[policy.slug] = policy;
    return acc;
  },
  {}
);

const DEFAULT_SLUG = POLICY_DATA[0].slug;

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.css'],
})
export class LegalComponent implements OnDestroy {
  protected readonly policies = POLICY_DATA;
  protected activePolicy: LegalPolicy = POLICY_LOOKUP[DEFAULT_SLUG];
  private subscription: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.subscription = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')?.toLowerCase() ?? DEFAULT_SLUG;
      this.activePolicy = POLICY_LOOKUP[slug] ?? POLICY_LOOKUP[DEFAULT_SLUG];
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
