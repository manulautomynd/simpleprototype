import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Territory } from '../../models/territory.model';

@Component({
  selector: 'app-territory-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './territory-info.component.html',
  styleUrl: './territory-info.component.css'
})
export class TerritoryInfoComponent {
  @Input() territory: Territory | null = null;
  @Input() stateName = '';

  get regionLabel(): string {
    return this.territory ? this.territory.name : 'No Territory Assigned';
  }

  get regionColor(): string {
    return this.territory ? this.territory.color : '#95a5a6';
  }

  get zipCodes(): string[] {
    if (!this.territory) return [];
    return this.territory.zipcodes[this.stateName] || [];
  }
}
