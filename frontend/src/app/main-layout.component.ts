import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from './material.module';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';

// Custom tooltip behavior
export const myTooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 300,
  hideDelay: 100,
  touchendHideDelay: 100,
  touchGestures: 'auto',
  position: 'right'
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  providers: [
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myTooltipDefaults }
  ]
})
export class MainLayoutComponent {
  isExpanded = signal<boolean>(true);
  
  toggleSideNav(): void {
    this.isExpanded.update(value => !value);
  }
}