import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../services/api', () => ({
  __esModule: true,
  fetchContratosEmpresarial: () => Promise.resolve([]),
  createContratoEmpresarial: () => Promise.resolve({}),
  updateContratoEmpresarial: () => Promise.resolve({}),
  deleteContratoEmpresarial: () => Promise.resolve({}),
  fetchProdutos: () => Promise.resolve([]),
  fetchInclusoes: () => Promise.resolve([]),
  createInclusao: () => Promise.resolve({}),
  updateInclusao: () => Promise.resolve({}),
  fetchContratosAdesao: () => Promise.resolve([]),
}));

jest.mock('../components/ui/dialog', () => {
  return {
    Dialog: ({ children, open }) => open ? <div data-testid="mock-dialog">{children}</div> : null,
    DialogContent: ({ children }) => <div data-testid="mock-dialog-content">{children}</div>,
    DialogHeader: ({ children }) => <div>{children}</div>,
    DialogFooter: ({ children }) => <div>{children}</div>,
    DialogTitle: ({ children }) => <h2>{children}</h2>,
    DialogDescription: ({ children }) => <p>{children}</p>,
    DialogClose: ({ children }) => <button>{children}</button>,
  };
});

import Empresarial from '../pages/Empresarial';
import Inclusao from '../pages/Inclusao';

describe('TDD: Campos adicionais de Plano e Valor Mensal', () => {
  test('GREEN: Empresarial deve permitir duplicar campos de Plano e escolher Faixas Etárias de valor mensal', async () => {
    render(<Empresarial tabId="pme" />);

    // Esperar carregar os dados
    expect(await screen.findByText('Nenhum contrato encontrado.')).toBeInTheDocument();

    // Clicar em "Novo PME" para abrir o modal
    const btnNovo = await screen.findByRole('button', { name: /Novo PME/i });
    fireEvent.click(btnNovo);

    // Deve mostrar o modal
    expect(await screen.findByText('Novo Contrato PME')).toBeInTheDocument();

    // 1. Testar se existe a opção de duplicar Plano usando o botão "+"
    const btnAddPlano = screen.getByRole('button', { name: '+' });
    expect(btnAddPlano).toBeInTheDocument();

    // Digitar no primeiro plano
    const inputsPlano = screen.getAllByPlaceholderText(/Digite o nome do plano/i);
    expect(inputsPlano).toHaveLength(1);
    fireEvent.change(inputsPlano[0], { target: { value: 'Plano Master Ouro' } });

    // Clicar no botão "+" para duplicar o plano
    fireEvent.click(btnAddPlano);

    // Agora deve haver 2 inputs para plano
    const inputsPlanoAfter = screen.getAllByPlaceholderText(/Digite o nome do plano/i);
    expect(inputsPlanoAfter).toHaveLength(2);

    // 2. Testar se existe as opções de Valor Mensal por Custo Médio e Faixa Etária
    expect(screen.getAllByText('Custo Médio Único')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Por Faixa Etária')[0]).toBeInTheDocument();

    // Selecionar "Por Faixa Etária"
    const radioFaixa = screen.getAllByLabelText('Por Faixa Etária')[0];
    fireEvent.click(radioFaixa);

    // Deve mostrar as faixas etárias padrão de saúde
    expect(screen.getAllByText('0 a 18 anos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('59 anos ou mais')[0]).toBeInTheDocument();
  });

  test('GREEN: Inclusão deve conter campos de Plano (duplicável) e Valor Mensal (custo médio ou faixa etária)', async () => {
    render(<Inclusao />);

    // Esperar carregar os dados
    expect(await screen.findByText('Nenhuma inclusão encontrada.')).toBeInTheDocument();

    // Clicar em "Nova Inclusão"
    const btnNovaInclusao = await screen.findByRole('button', { name: /Nova Inclusão/i });
    fireEvent.click(btnNovaInclusao);

    // Esperar abrir o modal verificando o label exclusivo
    expect(await screen.findByText('Nome do Beneficiário')).toBeInTheDocument();

    // Deve ter a opção "+" para adicionar múltiplos planos
    const btnAddPlano = screen.getByRole('button', { name: '+' });
    expect(btnAddPlano).toBeInTheDocument();

    // Digitar no primeiro plano
    const inputsPlano = screen.getAllByPlaceholderText(/Digite o nome do plano/i);
    expect(inputsPlano).toHaveLength(1);
    fireEvent.change(inputsPlano[0], { target: { value: 'Plano Ambulatorial' } });

    // Clicar no botão "+" para duplicar o plano
    fireEvent.click(btnAddPlano);

    // Agora deve haver 2 inputs para plano
    const inputsPlanoAfter = screen.getAllByPlaceholderText(/Digite o nome do plano/i);
    expect(inputsPlanoAfter).toHaveLength(2);

    // Deve ter opção de escolher tipo de valor mensal
    expect(screen.getAllByText('Custo Médio Único')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Por Faixa Etária')[0]).toBeInTheDocument();

    // Selecionar "Por Faixa Etária"
    const radioFaixa = screen.getAllByLabelText('Por Faixa Etária')[0];
    fireEvent.click(radioFaixa);

    // Deve mostrar as faixas etárias padrão de saúde
    expect(screen.getAllByText('0 a 18 anos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('59 anos ou mais')[0]).toBeInTheDocument();
  });
});
