import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

interface ProductCapability {
  icon: string;
  key: string;
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
    { icon: 'stadium', key: 'VENUES' },
    { icon: 'theater_comedy', key: 'SHOWS' },
    { icon: 'event', key: 'EVENTS' },
    { icon: 'event_seat', key: 'RESERVATIONS' },
    { icon: 'confirmation_number', key: 'TICKETS' },
    { icon: 'bar_chart', key: 'STATISTICS' }
  ];
}
