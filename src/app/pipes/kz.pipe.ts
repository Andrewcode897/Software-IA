import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'kz',
  pure: true,
})
export class KzPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    // Angolan currency format with dot thousands separator (e.g. 16.800)
    return Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
