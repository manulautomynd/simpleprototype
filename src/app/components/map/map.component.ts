import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import * as L from 'leaflet';
import { DataService, TEAM_COLORS, ACUITY_COLORS } from '../../services/data.service';
import { Practitioner } from '../../models/practitioner.model';
import { Territory } from '../../models/territory.model';
import { Patient } from '../../models/patient.model';

const GEO_URL =
  'https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/us-states.json';

const INACTIVE_STYLE: L.CircleMarkerOptions = {
  radius: 7,
  fillColor: '#95a5a6',
  color: '#7f8c8d',
  weight: 1,
  opacity: 1,
  fillOpacity: 0.85
};

const ACTIVE_STYLE: L.CircleMarkerOptions = {
  radius: 11,
  fillColor: '#ffffff',
  color: '#00d2ff',
  weight: 3,
  opacity: 1,
  fillOpacity: 0.95
};

const TEAM_HIGHLIGHT_STYLE: L.CircleMarkerOptions = {
  radius: 9,
  weight: 2,
  opacity: 1,
  fillOpacity: 1
};

const STATUS_COLORS: Record<string, string> = {
  available: '#74b9ff', // Soft blue — clearly idle/ready
  busy: '#ff7675',      // Soft red
  'on-visit': '#ffeaa7' // Soft gold
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: L.Map;
  private geojsonLayer!: L.GeoJSON;
  private practitionerMarkers: Record<string, L.CircleMarker> = {};
  private patientLayerGroup = L.layerGroup();
  private connectionLayerGroup = L.layerGroup();
  private previousActiveId: string | null = null;
  private previousActiveTeam: string | null = null;
  private legendAdded = false;
  private subscriptions: Subscription[] = [];

  private practitioners: Practitioner[] = [];
  private territories: Territory[] = [];

  constructor(private dataService: DataService) {}

  ngAfterViewInit(): void {
    this.initMap();

    // Subscribe to data loaded
    const dataSub = this.dataService.practitioners$.subscribe(practitioners => {
      if (practitioners.length > 0 && this.practitioners.length === 0) {
        this.practitioners = practitioners;
        this.dataService.territories$.subscribe(territories => {
          this.territories = territories;
          this.loadGeoJSON();
          this.addPractitionerMarkers();
          if (!this.legendAdded) {
            this.addLegend();
            this.legendAdded = true;
          }
        });
      }
    });
    this.subscriptions.push(dataSub);

    // Subscribe to active practitioner changes (highlight + connections)
    const activeSub = this.dataService.activePractitioner$.subscribe(p => {
      this.highlightPractitioner(p);
      this.updateConnectionLines(p);
    });
    this.subscriptions.push(activeSub);

    // Subscribe to active team changes
    const teamSub = this.dataService.activeTeam$.subscribe(team => {
      this.highlightTeam(team);
    });
    this.subscriptions.push(teamSub);

    // Subscribe to territory color toggle
    const colorSub = this.dataService.showTerritoryColors$.subscribe(() => {
      if (this.geojsonLayer) {
        this.geojsonLayer.setStyle((feature: any) => this.stateStyle(feature));
      }
    });
    this.subscriptions.push(colorSub);

    // Subscribe to filtered patients & show toggle
    const patientSub = combineLatest([
      this.dataService.filteredPatients$,
      this.dataService.showPatients$
    ]).subscribe(([patients, show]) => {
      this.updatePatientMarkers(patients, show);
    });
    this.subscriptions.push(patientSub);

    // Subscribe to active patient — fly to on select
    const activePatientSub = this.dataService.activePatient$.subscribe(patient => {
      if (patient) {
        this.map.flyTo([patient.lat, patient.lng], 8, { duration: 0.8 });
      }
    });
    this.subscriptions.push(activePatientSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([39.5, -98.35], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.patientLayerGroup.addTo(this.map);
    this.connectionLayerGroup.addTo(this.map);
  }

  private loadGeoJSON(): void {
    fetch(GEO_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load US States GeoJSON');
        return res.json();
      })
      .then(statesData => {
        this.geojsonLayer = L.geoJSON(statesData, {
          style: (feature) => this.stateStyle(feature),
          onEachFeature: (feature, layer) => this.onEachFeature(feature, layer)
        }).addTo(this.map);
      })
      .catch(err => console.error('GeoJSON load error:', err));
  }

  private stateStyle(feature: any): L.PathOptions {
    const stateName = feature?.properties?.name || feature?.properties?.NAME || '';
    const territory = this.dataService.getTerritoryForState(stateName);
    const showColors = this.dataService.getShowTerritoryColors();
    return {
      fillColor: (territory && showColors) ? territory.color : 'transparent',
      weight: 1.5,
      opacity: 1,
      color: showColors ? 'white' : 'rgba(255,255,255,0.15)',
      dashArray: '3',
      fillOpacity: (territory && showColors) ? 0.12 : 0
    };
  }

  private onEachFeature(feature: any, layer: L.Layer): void {
    const stateName = feature?.properties?.name || feature?.properties?.NAME || '';
    (layer as L.Path).on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const showColors = this.dataService.getShowTerritoryColors();
        e.target.setStyle({ weight: 2, color: 'white', dashArray: '', fillOpacity: showColors ? 0.3 : 0.05 });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        this.geojsonLayer.resetStyle(e.target);
      },
      click: () => {
        const territory = this.dataService.getTerritoryForState(stateName);
        this.dataService.setSelectedTerritoryInfo({ territory, stateName });
      }
    });
  }

  private getPractitionerStyle(p: Practitioner): L.CircleMarkerOptions {
    const statusColor = STATUS_COLORS[p.status.toLowerCase()] || '#95a5a6';

    const baseStyle: L.CircleMarkerOptions = { ...INACTIVE_STYLE, fillColor: statusColor, color: statusColor };

    // If active (selected by id)
    if (this.previousActiveId === p.id) {
      return ACTIVE_STYLE;
    }

    // If highlight by team
    const activeTeam = this.dataService.getActiveTeam();
    if (activeTeam && p.team === activeTeam) {
      const teamColor = TEAM_COLORS[activeTeam] || statusColor;
      return { ...TEAM_HIGHLIGHT_STYLE, fillColor: teamColor, color: teamColor };
    }

    return baseStyle;
  }

  private addPractitionerMarkers(): void {
    this.practitioners.forEach(p => {
      const style = this.getPractitionerStyle(p);
      const marker = L.circleMarker([p.lat, p.lng], style).addTo(this.map);

      marker.bindTooltip(`${p.name} (${p.team}) - ${p.status}`, {
        direction: 'top',
        offset: [0, -8],
        className: 'practitioner-tooltip'
      });

      marker.on('click', () => {
        this.dataService.setActivePractitioner(p);
      });

      this.practitionerMarkers[p.id] = marker;
    });
  }

  private highlightPractitioner(practitioner: Practitioner | null): void {
    // Reset ALL to their status-based or team-based style
    this.practitioners.forEach(p => {
      const marker = this.practitionerMarkers[p.id];
      if (marker) {
        const style = this.getPractitionerStyle(p);
        marker.setStyle(style);
        marker.setRadius((style.radius as number) || (INACTIVE_STYLE.radius as number));
      }
    });

    if (!practitioner) {
      this.previousActiveId = null;
      return;
    }

    const marker = this.practitionerMarkers[practitioner.id];
    if (marker) {
      marker.setStyle(ACTIVE_STYLE);
      marker.setRadius(ACTIVE_STYLE.radius as number);
      marker.bringToFront();
      this.map.flyTo([practitioner.lat, practitioner.lng], 7, { duration: 0.8 });
    }

    this.previousActiveId = practitioner.id;
  }

  private highlightTeam(team: string | null): void {
    // Re-apply styles to all based on status, team, and selection
    this.practitioners.forEach(p => {
      const marker = this.practitionerMarkers[p.id];
      if (!marker) return;
      const style = this.getPractitionerStyle(p);
      marker.setStyle(style);
      marker.setRadius((style.radius as number) || (INACTIVE_STYLE.radius as number));
      if (p.team === team || p.id === this.previousActiveId) {
        marker.bringToFront();
      }
    });

    this.previousActiveTeam = team;
  }

  /* ── Patient markers ── */

  private createPatientIcon(patient: Patient): L.DivIcon {
    const color = ACUITY_COLORS[patient.acuity] || '#95a5a6';
    const size = patient.acuity === 1 ? 14 : 11;
    const isUnassigned = patient.visitStatus === 'unassigned';
    const border = isUnassigned
      ? `2px dashed rgba(255,255,255,0.8)`
      : `2px solid rgba(255,255,255,0.5)`;
    const pulse = patient.acuity === 1 ? 'patient-pulse' : '';

    return L.divIcon({
      className: `patient-marker-wrapper ${pulse}`,
      html: `<div class="patient-diamond" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${border};
        transform: rotate(45deg);
        box-shadow: 0 0 6px ${color}88;
      "></div>`,
      iconSize: [size + 6, size + 6],
      iconAnchor: [(size + 6) / 2, (size + 6) / 2]
    });
  }

  private updatePatientMarkers(patients: Patient[], show: boolean): void {
    this.patientLayerGroup.clearLayers();
    if (!show) return;

    patients.forEach(patient => {
      const icon = this.createPatientIcon(patient);
      const marker = L.marker([patient.lat, patient.lng], { icon })
        .addTo(this.patientLayerGroup);

      // Tooltip on hover
      marker.bindTooltip(`${patient.name} (Cat ${patient.acuity})`, {
        direction: 'top',
        offset: [0, -10],
        className: 'patient-tooltip'
      });

      // Popup on click
      const genderHtml = patient.genderPreference !== 'none'
        ? `<div class="popup-row"><span class="popup-label">Preference</span><span class="popup-value pref-tag">${patient.genderPreference}</span></div>`
        : '';
      const practitioner = patient.assignedPractitioner
        ? this.dataService.getPractitionerById(patient.assignedPractitioner)
        : null;
      const assignedHtml = practitioner
        ? `<span class="popup-value">${practitioner.name}</span>`
        : `<span class="popup-value unassigned-val">⚠ Unassigned</span>`;

      marker.bindPopup(`
        <div class="patient-popup">
          <div class="popup-header">
            <strong>${patient.name}</strong>
            <span class="popup-acuity" style="background:${ACUITY_COLORS[patient.acuity]}22;color:${ACUITY_COLORS[patient.acuity]}">
              Cat ${patient.acuity}
            </span>
          </div>
          <div class="popup-row"><span class="popup-label">Condition</span><span class="popup-value">${patient.condition}</span></div>
          <div class="popup-row"><span class="popup-label">Status</span><span class="popup-value status-${patient.visitStatus}">${patient.visitStatus}</span></div>
          <div class="popup-row"><span class="popup-label">Assigned</span>${assignedHtml}</div>
          ${genderHtml}
          <div class="popup-row"><span class="popup-label">Phone</span><span class="popup-value">${patient.phone}</span></div>
        </div>
      `, {
        className: 'patient-popup-container',
        maxWidth: 280
      });

      marker.on('click', () => {
        this.dataService.setActivePatient(patient);
      });
    });
  }

  /* ── Connection lines ── */

  private updateConnectionLines(practitioner: Practitioner | null): void {
    this.connectionLayerGroup.clearLayers();
    if (!practitioner) return;

    const patients = this.dataService.getPatientsForPractitioner(practitioner.id);
    if (patients.length === 0) return;

    patients.forEach(patient => {
      // Dashed line from practitioner to patient
      const line = L.polyline(
        [[practitioner.lat, practitioner.lng], [patient.lat, patient.lng]],
        {
          color: ACUITY_COLORS[patient.acuity] || '#3498db',
          weight: 2.5,
          opacity: 0.7,
          dashArray: '8, 5'
        }
      ).addTo(this.connectionLayerGroup);

      line.bindTooltip(`→ ${patient.name} (Cat ${patient.acuity})`, {
        className: 'connection-tooltip'
      });
    });
  }

  /* ── Legend ── */

  private addLegend(): void {
    const LegendControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create('div', 'legend');
        let html = '';

        // Practitioners section
        html += '<div class="legend-section">';
        html += '<strong>Practitioners</strong>';
        html += '<div class="legend-row"><span class="legend-circle" style="background:#74b9ff"></span> Available</div>';
        html += '<div class="legend-row"><span class="legend-circle" style="background:#ff7675"></span> Busy</div>';
        html += '<div class="legend-row"><span class="legend-circle" style="background:#ffeaa7"></span> On Visit</div>';
        html += '<div class="legend-row"><span class="legend-circle" style="background:#fff;border:2px solid #00d2ff"></span> Selected</div>';
        html += '</div>';

        // Patients section
        html += '<div class="legend-section">';
        html += '<strong>Patients (Acuity)</strong>';
        html += '<div class="legend-row"><span class="legend-diamond" style="background:#e74c3c"></span> Cat 1 – Critical (24hr)</div>';
        html += '<div class="legend-row"><span class="legend-diamond" style="background:#f39c12"></span> Cat 2 – Urgent (48hr)</div>';
        html += '<div class="legend-row"><span class="legend-diamond" style="background:#27ae60"></span> Cat 3 – Routine</div>';
        html += '<div class="legend-row"><span class="legend-diamond-outline"></span> Unassigned</div>';
        html += '</div>';

        // Territories section
        html += '<div class="legend-section">';
        html += '<strong>Territories</strong>';
        this.territories.forEach(t => {
          html += `<div class="legend-row"><span class="legend-square" style="background:${t.color}"></span> ${t.name}</div>`;
        });
        html += '</div>';

        div.innerHTML = html;
        return div;
      }
    });

    new LegendControl({ position: 'bottomright' }).addTo(this.map);
  }
}
