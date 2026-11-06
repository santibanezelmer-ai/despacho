import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActivateVolunteer from '@/pages/ActivateVolunteer';
import LandingHeader from '@/components/landing/LandingHeader';
import LoginPage from '@/pages/LoginPage';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signIn: vi.fn() }) }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: {} } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: async () => ({ value: null }) } }));

function open(path = '/activar') {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/activar" element={<ActivateVolunteer />} />
    <Route path="/invite/:token" element={<div>Invitation reached</div>} />
  </Routes></MemoryRouter>);
}

function fillIdentity() {
  fireEvent.change(screen.getByPlaceholderText('tu@correo.cl'), { target: { value: 'volunteer@example.test' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { status: 'sent', challenge_id: 'challenge-a' }, error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Organization-scoped volunteer activation', () => {
  it.each([['landing', LandingHeader], ['login', LoginPage]] as const)('%s access requires an explicit organization instead of a fixed one', async (_name, Page) => {
    render(<HelmetProvider><MemoryRouter><Routes>
      <Route path="/" element={<Page />} />
      <Route path="/activar" element={<ActivateVolunteer />} />
    </Routes></MemoryRouter></HelmetProvider>);
    fireEvent.click(screen.getByRole('link', { name: /Soy voluntario|¿Eres voluntario y no tienes cuenta/ }));
    fillIdentity();
    expect(screen.getByRole('button', { name: 'Enviar código a mi correo' })).toBeDisabled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sends the explicitly entered Cuerpo code, email and consent with no RUT required', async () => {
    open();
    fillIdentity();
    fireEvent.change(screen.getByLabelText('Código de tu Cuerpo'), { target: { value: ' bomberos-otro-cuerpo ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código a mi correo' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('volunteer-activation', { body: {
      action: 'request', org: 'bomberos-otro-cuerpo', rut: '', email: 'volunteer@example.test', consent: true,
    } }));
  });

  it('preserves organization-specific shared links and verifies their own challenge before invitation navigation', async () => {
    open('/activar?org=org-inicial');
    fillIdentity();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código a mi correo' }));
    await waitFor(() => expect(invoke.mock.calls[0][1].body.org).toBe('org-inicial'));
    fireEvent.change(await screen.findByPlaceholderText('000000'), { target: { value: '123456' } });
    invoke.mockResolvedValueOnce({ data: { status: 'ok', token: 'verified-token' }, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y continuar' }));
    expect(await screen.findByText('Invitation reached')).toBeInTheDocument();
    expect(invoke).toHaveBeenLastCalledWith('volunteer-activation', { body: {
      action: 'verify', challenge_id: 'challenge-a', code: '123456',
    } });
  });
});