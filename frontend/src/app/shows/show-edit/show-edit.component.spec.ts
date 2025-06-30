import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShowEditComponent } from './show-edit.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('ShowEditComponent', () => {
  let component: ShowEditComponent;
  let fixture: ComponentFixture<ShowEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShowEditComponent,
        NoopAnimationsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        ReactiveFormsModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values in add mode', () => {
    component.isAddMode.set(true);
    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('description')?.value).toBe('');
    expect(component.form.get('ageFrom')?.value).toBe(0);
    expect(component.form.get('ageTo')?.value).toBe(99);
  });

  it('should require show name', () => {
    const nameControl = component.form.get('name');
    nameControl?.setValue('');
    expect(nameControl?.invalid).toBeTruthy();
    expect(nameControl?.errors?.['required']).toBeTruthy();
  });

  it('should validate age range', () => {
    const ageFromControl = component.form.get('ageFrom');
    const ageToControl = component.form.get('ageTo');
    
    ageFromControl?.setValue(-1);
    expect(ageFromControl?.invalid).toBeTruthy();
    expect(ageFromControl?.errors?.['min']).toBeTruthy();
    
    ageToControl?.setValue(150);
    expect(ageToControl?.invalid).toBeTruthy();
    expect(ageToControl?.errors?.['max']).toBeTruthy();
  });

  it('should set loading state initially to false in add mode', () => {
    component.isAddMode.set(true);
    expect(component.loading()).toBe(false);
  });
});
