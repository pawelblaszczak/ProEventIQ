import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderByName',
  standalone: true
})
export class OrderByNamePipe implements PipeTransform {
  transform<T extends { name?: string }>(items: T[] | null | undefined): T[] {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const aName = typeof a.name === 'string' ? a.name.toLowerCase() : '';
      const bName = typeof b.name === 'string' ? b.name.toLowerCase() : '';
      return aName.localeCompare(bName);
    });
  }
}
