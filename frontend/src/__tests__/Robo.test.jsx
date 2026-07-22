import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Robo from '../pages/Robo';

jest.mock('../services/api', () => ({
  fetchRoboStatus: jest.fn(),
  fetchRoboExecucoes: jest.fn(),
  fetchRoboConfig: jest.fn(),
  fetchRoboHistorico: jest.fn(),
  startRobo: jest.fn(),
  pauseRobo: jest.fn(),
  triggerRoboReal: jest.fn(),
}));

const { 
  fetchRoboStatus, 
  fetchRoboExecucoes, 
  fetchRoboConfig,
  fetchRoboHistorico,
  startRobo, 
  pauseRobo,
  triggerRoboReal 
} = require('../services/api');


beforeEach(() => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(window, 'prompt').mockReturnValue(null);
  fetchRoboHistorico.mockResolvedValue({ resumo: {}, boletos: [], arquivos: [], diagnosticos: [] });
  fetchRoboConfig.mockResolvedValue({ operadoras: [] });
});

afterEach(() => {
  jest.restoreAllMocks();
});


beforeEach(() => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('exibe estado carregado com status e histórico', async () => {
  fetchRoboStatus.mockResolvedValue({ status: 'ready', queue: 3, successRate: 98 });
  fetchRoboExecucoes.mockResolvedValue([{ id: '1', processo: 'Proc', inicio: 'Hoje', duracao: '1m', status: 'Concluído' }]);

  render(<Robo />);

  expect(await screen.findByText('Pronto para iniciar')).toBeInTheDocument();
  expect(screen.getByText('3 tarefas pendentes')).toBeInTheDocument();
  expect(screen.getByText('Proc')).toBeInTheDocument();
});

test('aciona iniciar e atualiza status', async () => {
  fetchRoboExecucoes.mockResolvedValue([]);
  fetchRoboStatus
    .mockResolvedValueOnce({ status: 'ready', queue: 0, successRate: 98 })
    .mockResolvedValueOnce({ status: 'running', queue: 0, successRate: 98 });
  startRobo.mockResolvedValue({ status: 'running' });

  render(<Robo />);

  const btn = await screen.findByRole('button', { name: /Iniciar Robô/i });
  await userEvent.click(btn);

  await waitFor(() => expect(startRobo).toHaveBeenCalledTimes(1));
  await waitFor(() => {
    expect(screen.getAllByText('Em execução').length).toBeGreaterThan(1);
  });
});
