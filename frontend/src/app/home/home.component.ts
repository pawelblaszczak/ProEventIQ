import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

interface ProductCapability {
  icon: string;
  key: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatIconModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  public readonly capabilities: ProductCapability[] = [
    { icon: 'stadium', key: 'VENUES', color: 'slate' },
    { icon: 'theater_comedy', key: 'SHOWS', color: 'purple' },
    { icon: 'event', key: 'EVENTS', color: 'green' },
    { icon: 'event_seat', key: 'RESERVATIONS', color: 'slate' },
    { icon: 'confirmation_number', key: 'TICKETS', color: 'blue' },
    { icon: 'bar_chart', key: 'STATISTICS', color: 'teal' }
  ];
}
