import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Practitioner } from '../../models/practitioner.model';
import { DataService, TEAM_COLORS } from '../../services/data.service';

@Component({
  selector: 'app-practitioner-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './practitioner-card.component.html',
  styleUrl: './practitioner-card.component.css'
})
export class PractitionerCardComponent {
  @Input() practitioner!: Practitioner;

  constructor(private dataService: DataService) {}

  get initials(): string {
    return this.dataService.getInitials(this.practitioner.name);
  }

  get territoryName(): string {
    const territory = this.dataService.getTerritoryById(this.practitioner.territory);
    return territory ? territory.name : '—';
  }

  get teamColor(): string {
    return TEAM_COLORS[this.practitioner.team] || '#95a5a6';
  }
}
