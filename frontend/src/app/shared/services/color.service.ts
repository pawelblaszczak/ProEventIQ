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
      '#E6194B',
      '#3CB44B',
      '#0082C8',
      '#F58230',
      '#911EB4',
      '#46F0F0',
      '#F032E6',
      '#D2F53C',
      '#FABED4',
      '#008080',
      '#DCBEFF',
      '#AA6E28',
      '#FFFAC8',
      '#800000',
      '#AAFFC3',
      '#808000',
      '#FFD7B4',
      '#000080',
      '#808080',
      '#000000',
      '#FF5500',
      '#00AAFF',
      '#00C88C',
      '#FF008C',
      '#8CFF00',
      '#FFC800',
      '#5A3CFF',
      '#005FB4',
      '#B478FF',
      '#00965A',
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
   * Returns an unused color from the palette given a list of used colors.
   * If all colors are used, returns a random color from the palette.
   * Comparison is case-insensitive and ignores surrounding whitespace.
   */
  public getUnusedColor(usedColors: (string | undefined)[]): string {
    const palette = this.getAvailableColors();
    const usedNormalized = new Set(usedColors.filter(Boolean).map(c => (c || '').trim().toLowerCase()));
    for (const color of palette) {
      if (!usedNormalized.has(color.trim().toLowerCase())) return color;
    }
    return this.generateRandomColor();
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
