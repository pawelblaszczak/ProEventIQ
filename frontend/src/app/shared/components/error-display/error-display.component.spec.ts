import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorDisplayComponent } from './error-display.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

describe('ErrorDisplayComponent', () => {
  let component: ErrorDisplayComponent;
  let fixture: ComponentFixture<ErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorDisplayComponent, MatCardModule, MatIconModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ErrorDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error message', () => {
    fixture.componentRef.setInput('error', 'Test error message');
    fixture.detectChanges();
    
    const errorElement = fixture.nativeElement.querySelector('.error-message p');
    expect(errorElement.textContent).toContain('Test error message');
  });

  it('should display custom title', () => {
    fixture.componentRef.setInput('error', 'Test error');
    fixture.componentRef.setInput('title', 'Custom Error Title');
    fixture.detectChanges();
    
    const titleElement = fixture.nativeElement.querySelector('.error-message h3');
    expect(titleElement.textContent).toContain('Custom Error Title');
  });

  it('should display custom icon', () => {
    fixture.componentRef.setInput('error', 'Test error');
    fixture.componentRef.setInput('icon', 'warning');
    fixture.detectChanges();
    
    const iconElement = fixture.nativeElement.querySelector('mat-icon');
    expect(iconElement.textContent).toContain('warning');
  });

  it('should apply custom CSS class', () => {
    fixture.componentRef.setInput('error', 'Test error');
    fixture.componentRef.setInput('cssClass', 'custom-class');
    fixture.detectChanges();
    
    const containerElement = fixture.nativeElement.querySelector('.error-container');
    expect(containerElement).toHaveClass('custom-class');
  });
});
