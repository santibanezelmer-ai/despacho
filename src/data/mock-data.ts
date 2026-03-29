export interface EmergencyKey {
  id: string;
  code: string;
  name: string;
  color: string;
  order: number;
  active: boolean;
}

export interface Emergency {
  id: string;
  folio: string;
  keyCode: string;
  keyName: string;
  keyColor: string;
  address: string;
  reference: string;
  caller: string;
  phone: string;
  observations: string;
  status: 'despacho' | 'en-ruta' | 'en-trabajo' | 'controlada' | 'finalizada';
  createdAt: Date;
  vehicles: string[];
  personnelCount: number;
  coordinates: { lat: number; lng: number };
}

export interface Vehicle {
  id: string;
  code: string;
  company: string;
  type: string;
  capacity: number;
  status: 'disponible' | 'en-servicio' | 'mantencion' | 'fuera-servicio';
}

export interface Volunteer {
  id: string;
  name: string;
  rut: string;
  rank: string;
  company: string;
  phone: string;
  status: 'activo' | 'inactivo' | 'licencia';
  available: boolean;
  specialties: string[];
}

export const emergencyKeys: EmergencyKey[] = [
  { id: '1', code: '10-0', name: 'Incendio Estructural', color: 'hsl(0, 85%, 55%)', order: 1, active: true },
  { id: '2', code: '10-1', name: 'Incendio Vehicular', color: 'hsl(15, 90%, 50%)', order: 2, active: true },
  { id: '3', code: '10-2', name: 'Incendio Forestal', color: 'hsl(30, 85%, 45%)', order: 3, active: true },
  { id: '4', code: '10-3', name: 'Rescate Vehicular', color: 'hsl(210, 85%, 55%)', order: 4, active: true },
  { id: '5', code: '10-4', name: 'Rescate en Altura', color: 'hsl(200, 80%, 50%)', order: 5, active: true },
  { id: '6', code: '10-5', name: 'Emergencia HazMat', color: 'hsl(55, 90%, 50%)', order: 6, active: true },
  { id: '7', code: '10-6', name: 'Rescate Acuático', color: 'hsl(190, 80%, 45%)', order: 7, active: true },
  { id: '8', code: '10-7', name: 'Apoyo Médico', color: 'hsl(145, 65%, 42%)', order: 8, active: true },
  { id: '9', code: '10-8', name: 'Derrame Combustible', color: 'hsl(35, 95%, 55%)', order: 9, active: true },
  { id: '10', code: '10-9', name: 'Alarma de Incendio', color: 'hsl(340, 80%, 50%)', order: 10, active: true },
  { id: '11', code: '10-10', name: 'Inundación', color: 'hsl(220, 70%, 50%)', order: 11, active: true },
  { id: '12', code: '10-11', name: 'Derrumbe', color: 'hsl(25, 60%, 40%)', order: 12, active: true },
];

export const activeEmergencies: Emergency[] = [
  {
    id: '1',
    folio: 'EMG-2026-0142',
    keyCode: '10-0',
    keyName: 'Incendio Estructural',
    keyColor: 'hsl(0, 85%, 55%)',
    address: 'Av. Libertador Bernardo O\'Higgins 1234',
    reference: 'Frente al mall',
    caller: 'Juan Pérez',
    phone: '+56 9 1234 5678',
    observations: 'Humo visible desde 3er piso',
    status: 'en-trabajo',
    createdAt: new Date(Date.now() - 45 * 60000),
    vehicles: ['B-1', 'B-2', 'Q-1'],
    personnelCount: 12,
    coordinates: { lat: -33.4489, lng: -70.6693 },
  },
  {
    id: '2',
    folio: 'EMG-2026-0143',
    keyCode: '10-3',
    keyName: 'Rescate Vehicular',
    keyColor: 'hsl(210, 85%, 55%)',
    address: 'Ruta 5 Sur Km 42',
    reference: 'Cerca de peaje',
    caller: 'María González',
    phone: '+56 9 8765 4321',
    observations: 'Colisión frontal, personas atrapadas',
    status: 'en-ruta',
    createdAt: new Date(Date.now() - 8 * 60000),
    vehicles: ['R-1', 'B-3'],
    personnelCount: 8,
    coordinates: { lat: -33.5100, lng: -70.6500 },
  },
  {
    id: '3',
    folio: 'EMG-2026-0144',
    keyCode: '10-7',
    keyName: 'Apoyo Médico',
    keyColor: 'hsl(145, 65%, 42%)',
    address: 'Calle San Martín 567',
    reference: 'Departamento 302',
    caller: 'Pedro Soto',
    phone: '+56 9 5555 1234',
    observations: 'Adulto mayor con dificultad respiratoria',
    status: 'despacho',
    createdAt: new Date(Date.now() - 2 * 60000),
    vehicles: ['A-1'],
    personnelCount: 4,
    coordinates: { lat: -33.4350, lng: -70.6550 },
  },
];

export const vehicles: Vehicle[] = [
  { id: '1', code: 'B-1', company: '1ª Compañía', type: 'Bomba', capacity: 6, status: 'en-servicio' },
  { id: '2', code: 'B-2', company: '1ª Compañía', type: 'Bomba', capacity: 6, status: 'en-servicio' },
  { id: '3', code: 'B-3', company: '2ª Compañía', type: 'Bomba', capacity: 6, status: 'en-servicio' },
  { id: '4', code: 'Q-1', company: '3ª Compañía', type: 'Escala', capacity: 4, status: 'en-servicio' },
  { id: '5', code: 'R-1', company: '4ª Compañía', type: 'Rescate', capacity: 5, status: 'en-servicio' },
  { id: '6', code: 'A-1', company: '5ª Compañía', type: 'Ambulancia', capacity: 3, status: 'en-servicio' },
  { id: '7', code: 'B-4', company: '2ª Compañía', type: 'Bomba', capacity: 6, status: 'disponible' },
  { id: '8', code: 'HZ-1', company: '6ª Compañía', type: 'HazMat', capacity: 4, status: 'disponible' },
  { id: '9', code: 'UT-1', company: '1ª Compañía', type: 'Utilitario', capacity: 3, status: 'mantencion' },
  { id: '10', code: 'B-5', company: '3ª Compañía', type: 'Bomba', capacity: 6, status: 'disponible' },
];

export const volunteers: Volunteer[] = [
  { id: '1', name: 'Carlos Muñoz', rut: '12.345.678-9', rank: 'Capitán', company: '1ª Compañía', phone: '+56 9 1111 2222', status: 'activo', available: true, specialties: ['Comando', 'Rescate'] },
  { id: '2', name: 'Ana Torres', rut: '13.456.789-0', rank: 'Teniente', company: '1ª Compañía', phone: '+56 9 2222 3333', status: 'activo', available: true, specialties: ['HazMat', 'Rescate'] },
  { id: '3', name: 'Roberto Silva', rut: '14.567.890-1', rank: 'Voluntario', company: '2ª Compañía', phone: '+56 9 3333 4444', status: 'activo', available: false, specialties: ['Conductor'] },
  { id: '4', name: 'María López', rut: '15.678.901-2', rank: 'Voluntario', company: '3ª Compañía', phone: '+56 9 4444 5555', status: 'activo', available: true, specialties: ['Paramédico'] },
  { id: '5', name: 'Diego Fernández', rut: '16.789.012-3', rank: 'Sargento', company: '4ª Compañía', phone: '+56 9 5555 6666', status: 'activo', available: true, specialties: ['Rescate en Altura'] },
];

export const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'despacho': { label: 'Despacho', color: 'hsl(270, 60%, 55%)', bg: 'bg-dispatch' },
  'en-ruta': { label: 'En Ruta', color: 'hsl(35, 95%, 55%)', bg: 'bg-warning' },
  'en-trabajo': { label: 'En Trabajo', color: 'hsl(0, 85%, 55%)', bg: 'bg-emergency' },
  'controlada': { label: 'Controlada', color: 'hsl(210, 85%, 55%)', bg: 'bg-info' },
  'finalizada': { label: 'Finalizada', color: 'hsl(145, 65%, 42%)', bg: 'bg-success' },
};

export const vehicleStatusConfig: Record<string, { label: string; color: string }> = {
  'disponible': { label: 'Disponible', color: 'hsl(145, 65%, 42%)' },
  'en-servicio': { label: 'En Servicio', color: 'hsl(0, 85%, 55%)' },
  'mantencion': { label: 'Mantención', color: 'hsl(35, 95%, 55%)' },
  'fuera-servicio': { label: 'Fuera de Servicio', color: 'hsl(0, 0%, 50%)' },
};
