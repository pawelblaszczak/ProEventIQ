import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { Router } from '@angular/router';

interface Feature {
  icon: string;
  title: string;
  description: string;
  benefits: string[];
}

interface Testimonial {
  text: string;
  author: string;
  role: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  
  features: Feature[] = [
    {
      icon: 'event_seat',
      title: 'Smart Seating Management',
      description: 'Optimize your venue with intelligent seating arrangements and real-time capacity management',
      benefits: [
        'Dynamic seat allocation',
        'Real-time availability tracking',
        'Accessibility compliance',
        'Revenue optimization'
      ]
    },
    {
      icon: 'schedule',
      title: 'Advanced Scheduling',
      description: 'Streamline your event scheduling with our intuitive calendar and automated booking system',
      benefits: [
        'Conflict-free scheduling',
        'Automated notifications',
        'Resource management',
        'Multi-venue coordination'
      ]
    },
    {
      icon: 'analytics',
      title: 'Powerful Analytics',
      description: 'Make data-driven decisions with comprehensive analytics and detailed reporting tools',
      benefits: [
        'Real-time dashboards',
        'Performance metrics',
        'Predictive insights',
        'Custom reports'
      ]
    }
  ];

  testimonials: Testimonial[] = [
    {
      text: 'ProEventIQ has revolutionized how we manage our venues. The analytics insights have helped us increase our booking efficiency by 40%.',
      author: 'Sarah Johnson',
      role: 'Event Director, MetroCenter'
    },
    {
      text: 'The smart seating feature alone has saved us countless hours and improved our customer satisfaction ratings significantly.',
      author: 'Michael Chen',
      role: 'Operations Manager, Grand Theatre'
    },
    {
      text: 'Outstanding platform with excellent support. The integration capabilities made our transition seamless and hassle-free.',
      author: 'Emily Rodriguez',
      role: 'IT Director, Conference Hub'
    }
  ];

  constructor(private router: Router) {}

  navigateToVenues() {
    this.router.navigate(['/venues']);
  }
}
