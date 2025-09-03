import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { Event as ApiEvent } from '../../api/model/event';
import { Venue } from '../../api/model/venue';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService, ColorService } from '../../shared';
import { ColorPickerDialogComponent } from './color-picker-dialog';
import { Participant } from '../../api/model/participant';
import { Reservation } from '../../api/model/reservation';
import { VenueMapEditComponent } from '../../venues/venue-map-edit/venue-map-edit.component';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    RouterModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    VenueMapEditComponent
  ],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventApi = inject(ProEventIQService);
  private readonly confirmationDialog = inject(ConfirmationDialogService);
  private readonly eventService = inject(EventService);
  private readonly dialog = inject(MatDialog);
  private readonly colorService = inject(ColorService);

  private readonly eventId = signal<number | null>(null);
  public event = signal<ApiEvent | null>(null);
  public venue = signal<Venue | null>(null);
  public loading = signal(true);
  public error = signal<string | null>(null);
  public participants = signal<Participant[]>([]);
  public reservations = signal<Reservation[]>([]);
  public editingParticipant = signal<string | null>(null);

  /** Returns the sum of numberOfTickets for all participants */
  public getTotalTickets(): number {
    const list = this.participants();
    return Array.isArray(list) ? list.reduce((sum, p) => sum + (p.numberOfTickets || 0), 0) : 0;
  }

  /** Returns the seat status text in format: "reserved/total (percentage%)" */
  public getSeatStatusText(): string {
    const venue = this.venue();
    if (!venue) return '0/0 (0%)';
    
    const totalSeats = venue.numberOfSeats ?? 0;
    const reserved = this.getTotalTickets();
    return this.eventService.getSeatStatusText(reserved, totalSeats);
  }

  /** Returns a color string for the seat status based on reserved percentage */
  public getSeatStatusColor(): string {
    const venue = this.venue();
    if (!venue) return 'hsl(0, 90%, 40%)';
    
    const reserved = this.getTotalTickets();
    const total = venue.numberOfSeats ?? 0;
    return this.eventService.getSeatStatusColor(reserved, total);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : null;

      this.eventId.set(id); // Or .next(id), depending on what eventId is

      if (id !== null && !isNaN(id)) {
        this.loadEvent(id);
        this.loadParticipants(id);
  this.loadReservations(id);
      }
    });
  }

  private loadEvent(eventId: number) {
    this.loading.set(true);
    this.error.set(null);

    // Try to load from API first, fallback to mock data if it fails
    this.eventApi.getEventById(eventId).subscribe({
      next: (event: ApiEvent) => {
        this.event.set(event);
        // Load venue data if venueId is available
        if (event.venueId) {
          this.loadVenue(event.venueId);
        } else {
          this.loading.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error loading event from API:', error);
        console.log('Falling back to mock data');
      }
    });
  }

  private loadVenue(venueId: number) {
    this.eventApi.getVenue(venueId).subscribe({
      next: (venue: Venue) => {
        this.venue.set(venue);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading venue data:', error);
        // Don't set error for venue loading failure, just continue without venue map
        this.loading.set(false);
      }
    });
  }

  private loadParticipants(eventId: number) {
    this.eventApi.eventsEventIdParticipantsGet(eventId).subscribe({
      next: (participants) => this.participants.set(participants),
      error: (err) => {
        console.error('Error loading participants:', err);
        this.participants.set([]);
      }
    });
  }

  private loadReservations(eventId: number) {
    this.eventApi.getReservation(eventId).subscribe({
      next: (reservations) => this.reservations.set(reservations ?? []),
      error: (err) => {
        console.error('Error loading reservations:', err);
        this.reservations.set([]);
      }
    });
  }

  public onDeleteParticipant(participantId: number) {
    const eventId = this.eventId();
    if (!eventId) return;
    this.confirmationDialog.confirm({
      title: 'Delete Participant',
      message: 'Are you sure you want to remove this participant?',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'warn',
      icon: 'delete_forever'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.eventApi.eventsEventIdParticipantsParticipantIdDelete(eventId, participantId).subscribe({
          next: () => this.loadParticipants(eventId),
          error: (err) => console.error('Error deleting participant:', err)
        });
      }
    });
  }

  public onGenerateReport(participantId: number) {
    const eventId = this.eventId();
    if (!eventId) return;

    // Show loading state or disable button
    console.log('Generating report for participant:', participantId);

    this.eventApi.eventsEventIdParticipantsParticipantIdReportGet(eventId, participantId, 'response').subscribe({
      next: (response: any) => {
        // Extract filename from Content-Disposition header
        const filename = this.getFilenameFromContentDisposition(response) || `participant_report_${participantId}.pdf`;
        
        // Create a blob URL and trigger download
        const blob = new Blob([response.body], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error generating participant report:', err);
        // Enhanced error handling with user-friendly messages
        let errorMessage = 'Failed to generate report. ';
        
        if (err.status === 404) {
          errorMessage += 'Participant or event not found.';
        } else if (err.status === 500) {
          errorMessage += 'Server error occurred. Please try again later.';
        } else if (err.error && typeof err.error === 'string') {
          errorMessage += err.error;
        } else {
          errorMessage += 'Please try again or contact support.';
        }
        
        // Here you can add a snackbar notification or alert
        // For now, we'll use console error and could add a toast notification
        console.error('User-friendly error:', errorMessage);
        alert(errorMessage); // Temporary - should be replaced with proper UI notification
      }
    });
  }

  public onGenerateAllReports() {
    const eventId = this.eventId();
    if (!eventId) return;

    const participantCount = this.participants().length;
    if (participantCount === 0) {
      alert('No participants found for this event.');
      return;
    }

    // Show loading state or disable button
    console.log('Generating ZIP file with all participant reports for event:', eventId);

    this.eventApi.eventsEventIdParticipantsReportsZipGet(eventId, 'response').subscribe({
      next: (response: any) => {
        // Extract filename from Content-Disposition header
        const filename = this.getFilenameFromContentDisposition(response) || `participant_reports_event_${eventId}.zip`;
        
        // Create a blob URL and trigger download
        const blob = new Blob([response.body], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log(`Successfully downloaded ZIP file with ${participantCount} participant reports`);
      },
      error: (err) => {
        console.error('Error generating ZIP file with participant reports:', err);
        // Enhanced error handling with user-friendly messages
        let errorMessage = 'Failed to generate reports ZIP file. ';
        
        if (err.status === 404) {
          errorMessage += 'Event not found or no participants registered.';
        } else if (err.status === 500) {
          errorMessage += 'Server error occurred. Please try again later.';
        } else if (err.error && typeof err.error === 'string') {
          errorMessage += err.error;
        } else {
          errorMessage += 'Please try again or contact support.';
        }
        
        // Here you can add a snackbar notification or alert
        // For now, we'll use console error and could add a toast notification
        console.error('User-friendly error:', errorMessage);
        alert(errorMessage); // Temporary - should be replaced with proper UI notification
      }
    });
  }

  private generateRandomColor(): string {
    return this.colorService.generateRandomColor();
  }

  public getAvailableColors(): string[] {
    return this.colorService.getAvailableColors();
  }

  public getContrastColor(hexColor: string | undefined): string {
    return this.colorService.getContrastColor(hexColor);
  }

  public openColorPicker(participant: Participant): void {
    const dialogRef = this.dialog.open(ColorPickerDialogComponent, {
      width: '450px',
      data: {
        currentColor: participant.seatColor,
        title: `Choose Seat Color for ${participant.name || 'Participant'}`
      }
    });

    dialogRef.afterClosed().subscribe(selectedColor => {
      if (selectedColor) {
        participant.seatColor = selectedColor;
        // Trigger change detection by updating the participants signal with a new array
        const currentParticipants = this.participants();
        this.participants.set([...currentParticipants]);
      }
    });
  }

  public onAddParticipant() {
    const currentParticipants = this.participants();
    const newParticipant: Participant = {
      participantId: -1,
      eventId: this.eventId() || 0,
      name: '',
      address: '',
      seatColor: this.generateRandomColor(),
      numberOfTickets: 1
    };
    this.participants.set([...currentParticipants, newParticipant]);
    this.editingParticipant.set('new');
  }

  public onEditParticipant(participantId: string) {
    this.editingParticipant.set(participantId);
  }

  public onSaveParticipant(participant: Participant) {
    const eventId = this.eventId();
    if (!eventId || !participant.name.trim()) return;

    if (participant.participantId === -1) {
      // Create new participant
      const participantInput = {
        name: participant.name,
        address: participant.address || undefined,
        seatColor: participant.seatColor || undefined,
        numberOfTickets: participant.numberOfTickets
      };
      this.eventApi.eventsEventIdParticipantsPost(eventId, participantInput).subscribe({
        next: () => {
          this.editingParticipant.set(null);
          this.loadParticipants(eventId);
        },
        error: (err) => console.error('Error creating participant:', err)
      });
    } else {
      // Update existing participant
      const participantInput = {
        name: participant.name,
        address: participant.address || undefined,
        seatColor: participant.seatColor || undefined,
        numberOfTickets: participant.numberOfTickets
      };
      this.eventApi.eventsEventIdParticipantsParticipantIdPut(eventId, participant.participantId, participantInput).subscribe({
        next: () => {
          this.editingParticipant.set(null);
          this.loadParticipants(eventId);
        },
        error: (err) => console.error('Error updating participant:', err)
      });
    }
  }

  public onCancelEdit() {
    this.editingParticipant.set(null);
    const eventId = this.eventId();
    if (eventId) {
      this.loadParticipants(eventId); // Reload to remove the 'new' participant or revert changes
    }
  }

  formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(dateTime: string | undefined): string {
    if (!dateTime) return 'TBD';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEventStatus(): string {
    const event = this.event();
    if (!event?.dateTime) return 'Unknown';
    
    const eventDate = new Date(event.dateTime);
    const now = new Date();
    
    if (eventDate > now) {
      return 'Upcoming';
    } else if (eventDate.toDateString() === now.toDateString()) {
      return 'Today';
    } else {
      return 'Past';
    }
  }

  getStatusColor(): string {
    const status = this.getEventStatus();
    switch (status) {
      case 'Today': return 'accent';
      case 'Upcoming': return 'primary';
      case 'Past': return 'warn';
      default: return '';
    }
  }

  onDelete(): void {
    const event = this.event();
    if (!event) return;

    this.confirmationDialog.confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.showName}" at ${event.venueName}? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'warn',
      icon: 'delete_forever'
    }).subscribe(confirmed => {
      if (confirmed && event.eventId) {
        this.deleteEvent(event.eventId);
      }
    });
  }

  private deleteEvent(eventId: number): void {
    this.loading.set(true);
    
    this.eventApi.deleteEvent(eventId).subscribe({
      next: () => {
        this.router.navigate(['/events']);
      },
      error: (error: any) => {
        console.error('Error deleting event:', error);
        this.error.set('Failed to delete event. Please try again.');
        this.loading.set(false);
      }
    });
  }

  navigateToShow(): void {
    const showId = this.event()?.showId;
    if (showId) {
      this.router.navigate(['/shows', showId]);
    }
  }

  navigateToVenue(): void {
    const venueId = this.event()?.venueId;
    if (venueId) {
      this.router.navigate(['/venues', venueId]);
    }
  }

  /**
   * Extracts filename from Content-Disposition header in HTTP response
   * @param response HTTP response with headers
   * @returns extracted filename or null if not found
   */
  private getFilenameFromContentDisposition(response: any): string | null {
    // Debug: log the response object
    console.debug('getFilenameFromContentDisposition: response', response);
    const contentDisposition = response.headers?.get?.('content-disposition') || 
                              response.headers?.get?.('Content-Disposition');
    // Debug: log the extracted header
    console.debug('Content-Disposition header:', contentDisposition);
    
    if (!contentDisposition) {
      console.warn('No Content-Disposition header found');
      return null;
    }

    // Parse Content-Disposition header to extract filename
    // Expected format: attachment; filename="some_file.pdf" or attachment; filename=some_file.pdf
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    // Debug: log the regex match result
    console.debug('Filename regex match:', filenameMatch);
    if (filenameMatch?.[1]) {
      // Remove quotes if present
      const extracted = filenameMatch[1].replace(/['"]/g, '');
      console.debug('Extracted filename:', extracted);
      return extracted;
    }

    console.warn('Filename not found in Content-Disposition header');
    return null;
  }
}
