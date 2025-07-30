import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  /**
   * Returns a color string for the seat status based on reserved percentage.
   * 0% = red, 50% = yellow, 100% = green (smooth gradient)
   */
  public getSeatStatusColor(reserved: number, total: number): string {
    let percentage = total > 0 ? reserved / total : 0;
    
    // Clamp between 0 and 1
    percentage = Math.max(0, Math.min(1, percentage));
    
    // Interpolate hue: 0 (red) -> 60 (yellow) -> 120 (green)
    // 0%: h=0, 50%: h=60, 100%: h=120
    let hue: number;
    if (percentage <= 0.5) {
      // Red to yellow
      hue = 0 + (percentage / 0.5) * 60;
    } else {
      // Yellow to green
      hue = 60 + ((percentage - 0.5) / 0.5) * 60;
    }
    return `hsl(${hue}, 90%, 40%)`;
  }

  /**
   * Returns the seat status text in format: "reserved/total (percentage%)"
   */
  public getSeatStatusText(reserved: number, total: number): string {
    let percentage = total > 0 ? Math.floor((reserved / total) * 100) : 0;
    
    // Only show 100% if reserved exactly equals total and total > 0
    if (total > 0 && reserved === total) {
      percentage = 100;
    } else if (percentage === 100) {
      percentage = 99;
    }
    return `${reserved}/${total} (${percentage}%)`;
  }

  /**
   * Returns the reservation class based on percentage for styling
   */
  public getReservationClass(reserved: number, total: number): string {
    const percentage = total > 0 ? (reserved / total) * 100 : 0;
    
    if (percentage <= 35) {
      return 'low-reservation';
    } else if (percentage <= 65) {
      return 'medium-reservation';
    } else {
      return 'high-reservation';
    }
  }
}
