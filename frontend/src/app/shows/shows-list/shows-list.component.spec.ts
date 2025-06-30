import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShowsListComponent } from './shows-list.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ShowsListComponent', () => {
  let component: ShowsListComponent;
  let fixture: ComponentFixture<ShowsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShowsListComponent,
        NoopAnimationsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty shows array', () => {
    expect(component.shows()).toEqual([]);
    expect(component.filteredShows()).toEqual([]);
  });

  it('should set loading state initially', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should filter shows by name', () => {
    const mockShows = [
      { showId: '1', name: 'The Lion King', description: 'Musical about Simba' },
      { showId: '2', name: 'Hamilton', description: 'Historical musical' }
    ];
    
    component.shows.set(mockShows);
    component.filteredShows.set(mockShows);
    
    const event = { target: { value: 'Lion' } } as any;
    component.applyFilter(event);
    
    expect(component.filteredShows().length).toBe(1);
    expect(component.filteredShows()[0].name).toBe('The Lion King');
  });

  it('should reset filters', () => {
    const mockShows = [
      { showId: '1', name: 'The Lion King', description: 'Musical about Simba' },
      { showId: '2', name: 'Hamilton', description: 'Historical musical' }
    ];
    
    component.shows.set(mockShows);
    component.filteredShows.set([mockShows[0]]); // Simulate filtered state
    
    component.resetFilters();
    
    expect(component.filteredShows().length).toBe(2);
  });
});
