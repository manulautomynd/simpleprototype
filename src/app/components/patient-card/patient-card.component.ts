import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../models/patient.model';
import { DataService, ACUITY_COLORS, ACUITY_LABELS } from '../../services/data.service';

@Component({
  selector: 'app-patient-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-card.component.html',
  styleUrl: './patient-card.component.css'
})
export class PatientCardComponent {
  @Input() patient!: Patient;

  constructor(private dataService: DataService) {}

  get initials(): string {
    return this.patient.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  get acuityColor(): string {
    return ACUITY_COLORS[this.patient.acuity] || '#95a5a6';
  }

  get acuityLabel(): string {
    return ACUITY_LABELS[this.patient.acuity] || 'Unknown';
  }

  get territoryName(): string {
    const territory = this.dataService.getTerritoryById(this.patient.territory);
    return territory ? territory.name : '—';
  }

  get assignedPractitionerName(): string {
    if (!this.patient.assignedPractitioner) return 'Unassigned';
    const p = this.dataService.getPractitionerById(this.patient.assignedPractitioner);
    return p ? p.name : 'Unknown';
  }

  get genderLabel(): string {
    switch (this.patient.genderPreference) {
      case 'female-only': return '♀ Female Only';
      case 'male-only': return '♂ Male Only';
      default: return 'No Preference';
    }
  }
}
