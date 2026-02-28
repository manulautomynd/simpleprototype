import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Practitioner } from '../models/practitioner.model';
import { Territory } from '../models/territory.model';
import { Patient } from '../models/patient.model';

export const TEAM_COLORS: Record<string, string> = {
  Cobalt: '#5B8DEF',
  Rose: '#FD79A8',
  Lavender: '#A29BFE',
  Teal: '#00CEC9',
  Indigo: '#6C5CE7'
};

export const ACUITY_COLORS: Record<number, string> = {
  1: '#e74c3c',
  2: '#f39c12',
  3: '#27ae60'
};

export const ACUITY_LABELS: Record<number, string> = {
  1: 'Critical (24hr)',
  2: 'Urgent (48hr)',
  3: 'Routine'
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private practitionersSubject = new BehaviorSubject<Practitioner[]>([]);
  private territoriesSubject = new BehaviorSubject<Territory[]>([]);
  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  private activePractitionerSubject = new BehaviorSubject<Practitioner | null>(null);
  private activePatientSubject = new BehaviorSubject<Patient | null>(null);
  private selectedTerritoryInfoSubject = new BehaviorSubject<{ territory: Territory | null; stateName: string } | null>(null);
  private activeTeamSubject = new BehaviorSubject<string | null>(null);
  private activeTerritoryFilterSubject = new BehaviorSubject<string | null>(null);
  private activeAcuityFilterSubject = new BehaviorSubject<number | null>(null);
  private showTerritoryColorsSubject = new BehaviorSubject<boolean>(true);
  private showPatientsSubject = new BehaviorSubject<boolean>(true);

  practitioners$ = this.practitionersSubject.asObservable();
  territories$ = this.territoriesSubject.asObservable();
  patients$ = this.patientsSubject.asObservable();
  activePractitioner$ = this.activePractitionerSubject.asObservable();
  activePatient$ = this.activePatientSubject.asObservable();
  selectedTerritoryInfo$ = this.selectedTerritoryInfoSubject.asObservable();
  activeTeam$ = this.activeTeamSubject.asObservable();
  activeTerritoryFilter$ = this.activeTerritoryFilterSubject.asObservable();
  activeAcuityFilter$ = this.activeAcuityFilterSubject.asObservable();
  showTerritoryColors$ = this.showTerritoryColorsSubject.asObservable();
  showPatients$ = this.showPatientsSubject.asObservable();

  /** Practitioners filtered by active team and territory */
  filteredPractitioners$ = combineLatest([
    this.practitionersSubject,
    this.activeTeamSubject,
    this.activeTerritoryFilterSubject
  ]).pipe(
    map(([practitioners, team, territory]) => {
      let filtered = practitioners;
      if (team) filtered = filtered.filter(p => p.team === team);
      if (territory) filtered = filtered.filter(p => p.territory === territory);
      return filtered;
    })
  );

  /** Patients filtered by territory and acuity */
  filteredPatients$ = combineLatest([
    this.patientsSubject,
    this.activeTerritoryFilterSubject,
    this.activeAcuityFilterSubject
  ]).pipe(
    map(([patients, territory, acuity]) => {
      let filtered = patients;
      if (territory) filtered = filtered.filter(p => p.territory === territory);
      if (acuity) filtered = filtered.filter(p => p.acuity === acuity);
      return filtered;
    })
  );

  /** Stats computed from current filtered data */
  stats$ = combineLatest([
    this.filteredPractitioners$,
    this.filteredPatients$
  ]).pipe(
    map(([practitioners, patients]) => ({
      availablePractitioners: practitioners.filter(p => p.status === 'available').length,
      onVisitPractitioners: practitioners.filter(p => p.status === 'on-visit').length,
      busyPractitioners: practitioners.filter(p => p.status === 'busy').length,
      totalPractitioners: practitioners.length,
      unassignedPatients: patients.filter(p => p.visitStatus === 'unassigned').length,
      highAcuityPatients: patients.filter(p => p.acuity === 1).length,
      totalPatients: patients.length
    }))
  );

  get teams(): string[] {
    return Object.keys(TEAM_COLORS);
  }

  constructor(private http: HttpClient) {}

  loadData(): Observable<{ practitioners: Practitioner[]; territories: Territory[]; patients: Patient[] }> {
    return forkJoin({
      practitioners: this.http.get<{ practitioners: Practitioner[] }>('assets/data/practitioners.json')
        .pipe(map(res => res.practitioners)),
      territories: this.http.get<{ territories: Territory[] }>('assets/data/territories.json')
        .pipe(map(res => res.territories)),
      patients: this.http.get<{ patients: Patient[] }>('assets/data/patients.json')
        .pipe(map(res => res.patients))
    }).pipe(
      map(data => {
        this.practitionersSubject.next(data.practitioners);
        this.territoriesSubject.next(data.territories);
        this.patientsSubject.next(data.patients);
        return data;
      })
    );
  }

  setActivePractitioner(practitioner: Practitioner | null): void {
    this.activePractitionerSubject.next(practitioner);
  }

  setActivePatient(patient: Patient | null): void {
    this.activePatientSubject.next(patient);
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

  setActiveTerritoryFilter(territory: string | null): void {
    this.activeTerritoryFilterSubject.next(territory);
  }

  getActiveTerritoryFilter(): string | null {
    return this.activeTerritoryFilterSubject.value;
  }

  setActiveAcuityFilter(acuity: number | null): void {
    this.activeAcuityFilterSubject.next(acuity);
  }

  setShowTerritoryColors(show: boolean): void {
    this.showTerritoryColorsSubject.next(show);
  }

  getShowTerritoryColors(): boolean {
    return this.showTerritoryColorsSubject.value;
  }

  setShowPatients(show: boolean): void {
    this.showPatientsSubject.next(show);
  }

  getShowPatients(): boolean {
    return this.showPatientsSubject.value;
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

  getPatientById(id: string): Patient | undefined {
    return this.patientsSubject.value.find(p => p.id === id);
  }

  getPatientsForPractitioner(practitionerId: string): Patient[] {
    return this.patientsSubject.value.filter(p => p.assignedPractitioner === practitionerId);
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
