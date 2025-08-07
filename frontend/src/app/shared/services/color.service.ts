import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  
  /**
   * Returns the standard set of available colors for participant seat selection
   */
  public getAvailableColors(): string[] {
    return [
      '#FF4444', // Red
      '#FF8800', // Orange
      '#FFDD00', // Yellow
      '#44AA44', // Green
      '#00CCCC', // Cyan
      '#4488FF', // Blue
      '#8844FF', // Purple
      '#FF44AA', // Pink
      '#666666', // Gray
      '#AA4400', // Brown
    ];
  }

  /**
   * Generates a random color from the available colors
   */
  public generateRandomColor(): string {
    const colors = this.getAvailableColors();
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Returns the appropriate contrast color (black or white) for a given hex color
   * @param hexColor The hex color to calculate contrast for
   * @returns '#000000' for light colors, '#ffffff' for dark colors
   */
  public getContrastColor(hexColor: string | undefined): string {
    if (!hexColor) return '#000000';
    
    // Remove # if present
    const color = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Validates if a string is a valid hex color
   * @param hex The hex string to validate
   * @returns true if valid hex color, false otherwise
   */
  public isValidHexColor(hex: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  }
}
