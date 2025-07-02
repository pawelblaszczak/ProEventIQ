import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EventDetailComponent } from './event-detail.component';
import { ProEventIQService } from '../../api/api/pro-event-iq.service';
import { ConfirmationDialogService } from '../../shared';
import { Event as ApiEvent } from '../../api/model/event';

describe('EventDetailComponent', () => {
  let component: EventDetailComponent;
  let fixture: ComponentFixture<EventDetailComponent>;
  let mockEventApi: jasmine.SpyObj<ProEventIQService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockConfirmationDialog: jasmine.SpyObj<ConfirmationDialogService>;

  const mockEvent: ApiEvent = {
    eventId: '1',
    showId: '1',
    venueId: '1',
    showName: 'Test Show',
    venueName: 'Test Venue',
    dateTime: '2025-07-15T19:30:00.000Z'
  };

  beforeEach(async () => {
    const eventApiSpy = jasmine.createSpyObj('ProEventIQService', ['getEventById', 'deleteEvent']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const routeSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      paramMap: of(new Map([['id', '1']]))
    });
    const confirmationDialogSpy = jasmine.createSpyObj('ConfirmationDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [EventDetailComponent],
      providers: [
        { provide: ProEventIQService, useValue: eventApiSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy },
        { provide: ConfirmationDialogService, useValue: confirmationDialogSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
    mockEventApi = TestBed.inject(ProEventIQService) as jasmine.SpyObj<ProEventIQService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockConfirmationDialog = TestBed.inject(ConfirmationDialogService) as jasmine.SpyObj<ConfirmationDialogService>;
  });

  beforeEach(() => {
    mockEventApi.getEventById.and.returnValue(of(mockEvent) as any);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load event on init', () => {
    component.ngOnInit();
    
    expect(mockEventApi.getEventById).toHaveBeenCalledWith('1');
    expect(component.event()).toEqual(mockEvent);
    expect(component.loading()).toBeFalse();
  });

  it('should handle API error and load mock data', () => {
    mockEventApi.getEventById.and.returnValue(throwError(() => new Error('API Error')));
    
    component.ngOnInit();
    
    expect(component.event()).toBeTruthy();
    expect(component.loading()).toBeFalse();
  });

  it('should format date correctly', () => {
    const formattedDate = component.formatDate('2025-07-15T19:30:00.000Z');
    expect(formattedDate).toContain('Tuesday, July 15, 2025');
  });

  it('should format time correctly', () => {
    const formattedTime = component.formatTime('2025-07-15T19:30:00.000Z');
    expect(formattedTime).toContain('7:30 PM');
  });

  it('should get event status correctly', () => {
    // Set up event with future date
    component.event.set({
      ...mockEvent,
      dateTime: new Date(Date.now() + 86400000).toISOString() // Tomorrow
    });
    
    expect(component.getEventStatus()).toBe('Upcoming');
  });

  it('should handle delete confirmation', () => {
    component.event.set(mockEvent);
    mockConfirmationDialog.confirm.and.returnValue(of(true));
    mockEventApi.deleteEvent.and.returnValue(of(null) as any);
    
    component.onDelete();
    
    expect(mockConfirmationDialog.confirm).toHaveBeenCalled();
    expect(mockEventApi.deleteEvent).toHaveBeenCalledWith('1');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/events']);
  });

  it('should navigate to show', () => {
    component.event.set(mockEvent);
    
    component.navigateToShow();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/shows', '1']);
  });

  it('should navigate to venue', () => {
    component.event.set(mockEvent);
    
    component.navigateToVenue();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/venues', '1']);
  });
});
