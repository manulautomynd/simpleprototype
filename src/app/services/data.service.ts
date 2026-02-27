import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Practitioner } from '../models/practitioner.model';
import { Territory } from '../models/territory.model';

export const TEAM_COLORS: Record<string, string> = {
  Blue: '#3498db',
  Red: '#e74c3c',
  Yellow: '#f1c40f',
  Green: '#2ecc71',
  Purple: '#9b59b6'
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private practitionersSubject = new BehaviorSubject<Practitioner[]>([]);
  private territoriesSubject = new BehaviorSubject<Territory[]>([]);
  private activePractitionerSubject = new BehaviorSubject<Practitioner | null>(null);
  private selectedTerritoryInfoSubject = new BehaviorSubject<{ territory: Territory | null; stateName: string } | null>(null);
  private activeTeamSubject = new BehaviorSubject<string | null>(null);
  private showTerritoryColorsSubject = new BehaviorSubject<boolean>(true);

  practitioners$ = this.practitionersSubject.asObservable();
  territories$ = this.territoriesSubject.asObservable();
  activePractitioner$ = this.activePractitionerSubject.asObservable();
  selectedTerritoryInfo$ = this.selectedTerritoryInfoSubject.asObservable();
  activeTeam$ = this.activeTeamSubject.asObservable();
  showTerritoryColors$ = this.showTerritoryColorsSubject.asObservable();

  /** Practitioners filtered by active team (if any) */
  filteredPractitioners$ = combineLatest([
    this.practitionersSubject,
    this.activeTeamSubject
  ]).pipe(
    map(([practitioners, team]) =>
      team ? practitioners.filter(p => p.team === team) : practitioners
    )
  );

  get teams(): string[] {
    return Object.keys(TEAM_COLORS);
  }

  constructor(private http: HttpClient) {}

  loadData(): Observable<{ practitioners: Practitioner[]; territories: Territory[] }> {
    return forkJoin({
      practitioners: this.http.get<{ practitioners: Practitioner[] }>('assets/data/practitioners.json')
        .pipe(map(res => res.practitioners)),
      territories: this.http.get<{ territories: Territory[] }>('assets/data/territories.json')
        .pipe(map(res => res.territories))
    }).pipe(
      map(data => {
        this.practitionersSubject.next(data.practitioners);
        this.territoriesSubject.next(data.territories);
        return data;
      })
    );
  }

  setActivePractitioner(practitioner: Practitioner | null): void {
    this.activePractitionerSubject.next(practitioner);
  }

  setSelectedTerritoryInfo(info: { territory: Territory | null; stateName: string } | null): void {
    this.selectedTerritoryInfoSubject.next(info);
  }

  setActiveTeam(team: string | null): void {
    this.activeTeamSubject.next(team);
  }

  getActiveTeam(): string | null {
    return this.activeTeamSubject.value;
  }

  setShowTerritoryColors(show: boolean): void {
    this.showTerritoryColorsSubject.next(show);
  }

  getShowTerritoryColors(): boolean {
    return this.showTerritoryColorsSubject.value;
  }

  getTerritoryById(id: string): Territory | undefined {
    return this.territoriesSubject.value.find(t => t.id === id);
  }

  getTerritoryForState(stateName: string): Territory | null {
    const normalised = stateName.trim().toLowerCase();
    return this.territoriesSubject.value.find(t =>
      t.states.some(s => s.trim().toLowerCase() === normalised)
    ) ?? null;
  }

  getPractitionerById(id: string): Practitioner | undefined {
    return this.practitionersSubject.value.find(p => p.id === id);
  }

  getInitials(name: string): string {
    return name
      .replace(/^Dr\.\s*/, '')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }
}
