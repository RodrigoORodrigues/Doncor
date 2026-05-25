import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenericPage from '../pages/GenericPage';

test('renderiza seção de perfil com campos principais', () => {
  render(<GenericPage pageId="perfil" pageLabel="Meu Perfil" />);
  expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Carlos Eduardo Silva')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeInTheDocument();
});

test('renderiza seção de configurações com toggles', () => {
  render(<GenericPage pageId="configuracoes" pageLabel="Configurações" />);
  expect(screen.getByText('Configurações')).toBeInTheDocument();
  expect(screen.getByLabelText(/Receber notificações por e-mail/i)).toBeInTheDocument();
});

test('monta mailto com assunto e mensagem no suporte', async () => {
  render(<GenericPage pageId="suporte" pageLabel="Suporte" />);
  await userEvent.type(screen.getByLabelText('Assunto'), 'Ajuda urgente');
  await userEvent.type(screen.getByLabelText('Mensagem'), 'Erro na tela inicial');

  const link = screen.getByRole('link', { name: /Enviar e-mail para/i });
  expect(link).toHaveAttribute('href', expect.stringContaining('mailto:donfim@gmail.com'));
  expect(link).toHaveAttribute('href', expect.stringContaining('subject=Ajuda%20urgente'));
});
