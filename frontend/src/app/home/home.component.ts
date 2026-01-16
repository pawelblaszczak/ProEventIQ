import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

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
  imports: [CommonModule, MaterialModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  
  features: Feature[] = [
    {
      icon: 'event_seat',
      title: 'HOME.FEATURE_CARDS.1.TITLE',
      description: 'HOME.FEATURE_CARDS.1.DESCRIPTION',
      benefits: [
        'HOME.FEATURE_CARDS.1.BENEFIT1',
        'HOME.FEATURE_CARDS.1.BENEFIT2',
        'HOME.FEATURE_CARDS.1.BENEFIT3',
        'HOME.FEATURE_CARDS.1.BENEFIT4'
      ]
    },
    {
      icon: 'schedule',
      title: 'HOME.FEATURE_CARDS.2.TITLE',
      description: 'HOME.FEATURE_CARDS.2.DESCRIPTION',
      benefits: [
        'HOME.FEATURE_CARDS.2.BENEFIT1',
        'HOME.FEATURE_CARDS.2.BENEFIT2',
        'HOME.FEATURE_CARDS.2.BENEFIT3',
        'HOME.FEATURE_CARDS.2.BENEFIT4'
      ]
    },
    {
      icon: 'analytics',
      title: 'HOME.FEATURE_CARDS.3.TITLE',
      description: 'HOME.FEATURE_CARDS.3.DESCRIPTION',
      benefits: [
        'HOME.FEATURE_CARDS.3.BENEFIT1',
        'HOME.FEATURE_CARDS.3.BENEFIT2',
        'HOME.FEATURE_CARDS.3.BENEFIT3',
        'HOME.FEATURE_CARDS.3.BENEFIT4'
      ]
    }
  ];

  testimonials: Testimonial[] = [
    {
  text: 'ProEventIQ has revolutionized how we manage our venues. The analytics insights have helped us significantly improve our booking efficiency.',
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
