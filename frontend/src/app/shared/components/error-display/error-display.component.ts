import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './error-display.component.html',
  styleUrls: ['./error-display.component.scss']
})
export class ErrorDisplayComponent {
  /**
   * The error message to display
   */
  error = input.required<string>();

  /**
   * The title to display in the error card
   * @default 'Error'
   */
  title = input<string>('Error');

  /**
   * The icon to display in the error card
   * @default 'error_outline'
   */
  icon = input<string>('error_outline');

  /**
   * Additional CSS classes to apply to the error container
   */
  cssClass = input<string>('');
}
