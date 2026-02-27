import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataService, TEAM_COLORS } from '../../services/data.service';
import { PractitionerCardComponent } from '../practitioner-card/practitioner-card.component';
import { TerritoryInfoComponent } from '../territory-info/territory-info.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, PractitionerCardComponent, TerritoryInfoComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);

  practitioners$ = this.dataService.practitioners$;
  filteredPractitioners$ = this.dataService.filteredPractitioners$;
  activePractitioner$ = this.dataService.activePractitioner$;
  selectedTerritoryInfo$ = this.dataService.selectedTerritoryInfo$;
  activeTeam$ = this.dataService.activeTeam$;

  teams = this.dataService.teams;
  teamColors = TEAM_COLORS;

  selectedPractitionerId = '';
  selectedTeam = '';
  showTerritoryColors = true;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    // Keep dropdown in sync when practitioner is selected via map marker click
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

  onToggleTerritoryColors(): void {
    this.showTerritoryColors = !this.showTerritoryColors;
    this.dataService.setShowTerritoryColors(this.showTerritoryColors);
  }
}
