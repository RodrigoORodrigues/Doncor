import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../components/ProtectedRoute';

jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }));
const { useAuth } = require('../hooks/useAuth');

const renderWithRoute = (authValue, allowedRoles = ['admin']) => {
  useAuth.mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/acesso-negado" element={<div>Acesso Negado</div>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={allowedRoles}><div>Área Admin</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
};

test('redireciona para login quando não autenticado', async () => {
  renderWithRoute({ user: null, profile: null, loading: false });
  expect(await screen.findByText('Login')).toBeInTheDocument();
});

test('redireciona para acesso negado quando role não permitida', async () => {
  renderWithRoute({ user: { id: '1' }, profile: { role: 'agente' }, loading: false });
  expect(await screen.findByText('Acesso Negado')).toBeInTheDocument();
});

test('renderiza conteúdo quando autenticado e autorizado', async () => {
  renderWithRoute({ user: { id: '1' }, profile: { role: 'admin' }, loading: false });
  expect(await screen.findByText('Área Admin')).toBeInTheDocument();
});
