import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'proeventiq.ticketDescriptionClipboard';

/** Frontend-only clipboard for copying/pasting HTML ticket descriptions between events */
@Injectable({
  providedIn: 'root'
})
export class TicketDescriptionClipboardService {
  public readonly content = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  public copy(html: string): void {
    localStorage.setItem(STORAGE_KEY, html);
    this.content.set(html);
  }

  public hasContent(): boolean {
    return !!this.content();
  }

  public get(): string | null {
    return this.content();
  }
}
