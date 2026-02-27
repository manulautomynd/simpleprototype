import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { DataService, TEAM_COLORS } from '../../services/data.service';
import { Practitioner } from '../../models/practitioner.model';
import { Territory } from '../../models/territory.model';

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
  radius: 10,
  fillColor: '#2ecc71',
  color: '#27ae60',
  weight: 2,
  opacity: 1,
  fillOpacity: 1
};

const TEAM_HIGHLIGHT_STYLE: L.CircleMarkerOptions = {
  radius: 9,
  weight: 2,
  opacity: 1,
  fillOpacity: 1
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

    // Subscribe to active practitioner changes
    const activeSub = this.dataService.activePractitioner$.subscribe(p => {
      this.highlightPractitioner(p);
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
      fillColor: (territory && showColors) ? territory.color : '#bdc3c7',
      weight: 1.5,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: (territory && showColors) ? 0.25 : 0.05
    };
  }

  private onEachFeature(feature: any, layer: L.Layer): void {
    const stateName = feature?.properties?.name || feature?.properties?.NAME || '';
    (layer as L.Path).on({
      mouseover: (e: L.LeafletMouseEvent) => {
        e.target.setStyle({ weight: 2, color: 'white', dashArray: '', fillOpacity: 0.45 });
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

  private addPractitionerMarkers(): void {
    this.practitioners.forEach(p => {
      const marker = L.circleMarker([p.lat, p.lng], INACTIVE_STYLE).addTo(this.map);

      marker.bindTooltip(`${p.name} (${p.team})`, {
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
    // Reset previous
    if (this.previousActiveId && this.practitionerMarkers[this.previousActiveId]) {
      const prev = this.practitionerMarkers[this.previousActiveId];
      // If there's an active team, restore to team color; otherwise inactive
      const activeTeam = this.dataService.getActiveTeam();
      const prevPract = this.practitioners.find(p => p.id === this.previousActiveId);
      if (activeTeam && prevPract && prevPract.team === activeTeam) {
        const teamColor = TEAM_COLORS[activeTeam] || INACTIVE_STYLE.fillColor;
        prev.setStyle({ ...TEAM_HIGHLIGHT_STYLE, fillColor: teamColor, color: teamColor });
        prev.setRadius(TEAM_HIGHLIGHT_STYLE.radius as number);
      } else {
        prev.setStyle(INACTIVE_STYLE);
        prev.setRadius(INACTIVE_STYLE.radius as number);
      }
    }

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
    // Reset all markers first
    this.practitioners.forEach(p => {
      const marker = this.practitionerMarkers[p.id];
      if (!marker) return;
      // Don't reset individually-selected practitioner
      if (p.id === this.previousActiveId) return;
      marker.setStyle(INACTIVE_STYLE);
      marker.setRadius(INACTIVE_STYLE.radius as number);
    });

    if (!team) {
      this.previousActiveTeam = null;
      return;
    }

    const teamColor = TEAM_COLORS[team] || '#95a5a6';
    this.practitioners
      .filter(p => p.team === team)
      .forEach(p => {
        const marker = this.practitionerMarkers[p.id];
        if (!marker) return;
        // Don't override individually-selected practitioner
        if (p.id === this.previousActiveId) return;
        marker.setStyle({ ...TEAM_HIGHLIGHT_STYLE, fillColor: teamColor, color: teamColor });
        marker.setRadius(TEAM_HIGHLIGHT_STYLE.radius as number);
        marker.bringToFront();
      });

    this.previousActiveTeam = team;
  }

  private addLegend(): void {
    const LegendControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create('div', 'legend');
        let html = '<strong>Territories</strong><br>';
        this.territories.forEach(t => {
          html += `<i style="background:${t.color}"></i> ${t.name}<br>`;
        });
        html += '<br><strong>Teams</strong><br>';
        Object.entries(TEAM_COLORS).forEach(([name, color]) => {
          html += `<i style="background:${color}"></i> ${name}<br>`;
        });
        html += '<br><strong>Practitioners</strong><br>';
        html += '<i style="background:#95a5a6"></i> Inactive<br>';
        html += '<i style="background:#2ecc71"></i> Active (selected)<br>';
        div.innerHTML = html;
        return div;
      }
    });

    new LegendControl({ position: 'bottomright' }).addTo(this.map);
  }
}
