export interface Territory {
  id: string;
  name: string;
  color: string;
  states: string[];
  zipcodes: { [state: string]: string[] };
}
