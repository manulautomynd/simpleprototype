import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MapComponent } from './components/map/map.component';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, MapComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.loadData().subscribe({
      error: (err) => console.error('Failed to load data:', err)
    });
  }
}
