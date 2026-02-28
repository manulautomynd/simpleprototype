export interface Patient {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  territory: string;
  acuity: number;
  genderPreference: 'male-only' | 'female-only' | 'none';
  assignedPractitioner: string | null;
  visitStatus: 'scheduled' | 'unassigned' | 'completed' | 'in-progress';
  condition: string;
  phone: string;
}
