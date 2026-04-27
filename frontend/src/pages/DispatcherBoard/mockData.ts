export interface Job {
  id: string;
  title: string;
  status: 'DRAFT' | 'ASSIGNED';
  assignedDriverId: string | null;
}

export interface Driver {
  id: string;
  name: string;
}

export const mockDrivers: Driver[] = [
  { id: 'driver-1', name: 'Matti Virtanen' },
  { id: 'driver-2', name: 'Liisa Korhonen' },
  { id: 'driver-3', name: 'Juhani Mäkinen' },
];

export const mockJobs: Job[] = [
  { id: 'job-1', title: 'Nouto: Hakaniemi → Pasila', status: 'DRAFT', assignedDriverId: null },
  { id: 'job-2', title: 'Toimitus: Kallio → Töölö', status: 'DRAFT', assignedDriverId: null },
  { id: 'job-3', title: 'Siirto: Espoo → Helsinki', status: 'DRAFT', assignedDriverId: null },
  { id: 'job-4', title: 'Nouto: Kamppi → Lauttasaari', status: 'ASSIGNED', assignedDriverId: 'driver-1' },
  { id: 'job-5', title: 'Toimitus: Itäkeskus → Herttoniemi', status: 'ASSIGNED', assignedDriverId: 'driver-1' },
  { id: 'job-6', title: 'Siirto: Vantaa → Kerava', status: 'ASSIGNED', assignedDriverId: 'driver-2' },
];
