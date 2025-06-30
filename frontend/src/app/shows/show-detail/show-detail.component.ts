import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { Show } from '../../api/model/show';

@Component({
  selector: 'app-show-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatProgressSpinnerModule, RouterModule],
  templateUrl: './show-detail.component.html',
  styleUrl: './show-detail.component.scss'
})
export class ShowDetailComponent implements OnInit {
  private readonly apiService = inject(ProEventIQService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  
  show = signal<Show | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    const showId = this.route.snapshot.paramMap.get('id');
    if (showId) {
      this.loadShow(showId);
    }
  }

  private loadShow(showId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.apiService.getShowById(showId).subscribe({
      next: (show: Show) => {
        this.show.set(show);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading show:', error);
        this.error.set('Failed to load show details');
        this.isLoading.set(false);
      }
    });
  }

  editShow(): void {
    const show = this.show();
    if (show?.showId) {
      this.router.navigate(['/shows', show.showId, 'edit']);
    }
  }

  goBack(): void {
    this.router.navigate(['/shows']);
  }
}
