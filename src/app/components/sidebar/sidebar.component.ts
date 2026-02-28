import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataService, TEAM_COLORS, ACUITY_COLORS } from '../../services/data.service';
import { PractitionerCardComponent } from '../practitioner-card/practitioner-card.component';
import { PatientCardComponent } from '../patient-card/patient-card.component';
import { TerritoryInfoComponent } from '../territory-info/territory-info.component';
import { Patient } from '../../models/patient.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, PractitionerCardComponent, PatientCardComponent, TerritoryInfoComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);

  practitioners$ = this.dataService.practitioners$;
  filteredPractitioners$ = this.dataService.filteredPractitioners$;
  filteredPatients$ = this.dataService.filteredPatients$;
  activePractitioner$ = this.dataService.activePractitioner$;
  activePatient$ = this.dataService.activePatient$;
  selectedTerritoryInfo$ = this.dataService.selectedTerritoryInfo$;
  activeTeam$ = this.dataService.activeTeam$;
  territories$ = this.dataService.territories$;
  stats$ = this.dataService.stats$;

  teams = this.dataService.teams;
  teamColors = TEAM_COLORS;
  acuityColors = ACUITY_COLORS;

  selectedPractitionerId = '';
  selectedTeam = '';
  selectedTerritory = '';
  selectedAcuity = 0;
  showTerritoryColors = true;
  showPatients = true;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    const sub1 = this.activePractitioner$.subscribe(p => {
      this.selectedPractitionerId = p ? p.id : '';
    });
    this.subs.push(sub1);

    const sub2 = this.activeTeam$.subscribe(team => {
      this.selectedTeam = team || '';
    });
    this.subs.push(sub2);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  onPractitionerChange(): void {
    if (this.selectedPractitionerId) {
      const p = this.dataService.getPractitionerById(this.selectedPractitionerId);
      this.dataService.setActivePractitioner(p ?? null);
    } else {
      this.dataService.setActivePractitioner(null);
    }
  }

  onTeamChange(): void {
    this.dataService.setActiveTeam(this.selectedTeam || null);
  }

  onTerritoryChange(): void {
    this.dataService.setActiveTerritoryFilter(this.selectedTerritory || null);
  }

  onAcuityChange(): void {
    this.dataService.setActiveAcuityFilter(this.selectedAcuity || null);
  }

  onToggleTerritoryColors(): void {
    this.showTerritoryColors = !this.showTerritoryColors;
    this.dataService.setShowTerritoryColors(this.showTerritoryColors);
  }

  onTogglePatients(): void {
    this.showPatients = !this.showPatients;
    this.dataService.setShowPatients(this.showPatients);
  }

  onPatientClick(patient: Patient): void {
    this.dataService.setActivePatient(patient);
  }

  getAcuityColor(acuity: number): string {
    return ACUITY_COLORS[acuity] || '#95a5a6';
  }

  getShortTerritoryName(name: string): string {
    const abbr: Record<string, string> = {
      'Northeast Region': 'NE',
      'Southern Region': 'South',
      'Midwest Region': 'MW',
      'Western Region': 'West'
    };
    return abbr[name] || name;
  }
}
