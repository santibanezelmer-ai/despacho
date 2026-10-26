import { describe, it, expect } from 'vitest';
import { isValidLatLng, coordRangeMessage } from '@/lib/coords';

describe('validación de coordenadas antes de guardar', () => {
  it('acepta coordenada válida dentro de Chile', () => {
    expect(isValidLatLng(-40.70908, -72.51426)).toBe(true);
  });
  it('acepta coordenada válida fuera de Chile', () => {
    expect(isValidLatLng(-34.6037, -58.3816)).toBe(true);
    expect(isValidLatLng(48.8566, 2.3522)).toBe(true);
  });
  it('bloquea latitud > 90', () => {
    expect(isValidLatLng(90.0001, -72.5)).toBe(false);
    expect(isValidLatLng(123.4, -72.5)).toBe(false);
  });
  it('bloquea latitud < -90', () => {
    expect(isValidLatLng(-90.0001, -72.5)).toBe(false);
  });
  it('bloquea longitud > 180', () => {
    expect(isValidLatLng(-40.7, 180.0001)).toBe(false);
  });
  it('bloquea longitud < -180 (caso real: -344.6 y -1044.68)', () => {
    expect(isValidLatLng(-40.7, -344.6)).toBe(false);
    expect(isValidLatLng(-34.30714, -1044.67933)).toBe(false);
  });
  it('acepta los bordes exactos', () => {
    expect(isValidLatLng(90, 180)).toBe(true);
    expect(isValidLatLng(-90, -180)).toBe(true);
  });
  it('bloquea valores no numéricos', () => {
    expect(isValidLatLng(NaN, -72)).toBe(false);
    expect(isValidLatLng(-40, Infinity)).toBe(false);
  });
  it('el mensaje explica el problema sin corregir la coordenada', () => {
    const msg = coordRangeMessage(-34.30714, -1044.67933);
    expect(msg).toContain('longitud');
    expect(msg).toContain('-180 y 180');
    expect(msg).toContain('-1044.6793');
  });
});
