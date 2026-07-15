import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the services/api layer
const mockChatMessages = [
  {
    id: 'msg-1',
    empresa: 'Empresa Alpha',
    company: 'Empresa Alpha',
    text: 'Olá, preciso de ajuda com meu plano',
    direction: 'incoming',
    read: false,
    createdAt: '2026-07-15T12:00:00Z',
    sender: 'José',
    senderRole: 'empresa'
  },
  {
    id: 'msg-2',
    empresa: 'Empresa Alpha',
    company: 'Empresa Alpha',
    text: 'Nova solicitação de Inclusão enviada pelo Portal do Cliente',
    direction: 'incoming',
    read: false,
    createdAt: '2026-07-15T12:05:00Z',
    protocolo: 'CLI-0357', // This field identifies it as a movement notification!
    sender: 'Empresa Alpha',
    senderRole: 'portal',
    attachments: [
      { name: 'documento_identidade.pdf', size: 153600, base64: 'data:application/pdf;base64,abc' }
    ],
    anexos: [
      { name: 'documento_identidade.pdf', size: 153600, base64: 'data:application/pdf;base64,abc' }
    ]
  }
];

jest.mock('../services/api', () => ({
  __esModule: true,
  fetchContratosEmpresarial: () => Promise.resolve([{ empresa: 'Empresa Alpha', cnpj: '12345678000199' }]),
  fetchPortalParceiros: () => Promise.resolve([]),
  fetchPortalDonCorChat: () => Promise.resolve(mockChatMessages),
  sendPortalDonCorChat: () => Promise.resolve({}),
  markPortalDonCorChatRead: () => Promise.resolve({}),
  fetchInclusoes: () => Promise.resolve([{
    id: 'inc-1',
    protocolo: 'CLI-0357',
    beneficiario: 'Fulano de Tal',
    cpf: '111.111.111-11',
    status: 'Pendente',
    attachments: [{ name: 'documento_identidade.pdf', size: 153600, base64: 'data:application/pdf;base64,abc' }],
    anexos: [{ name: 'documento_identidade.pdf', size: 153600, base64: 'data:application/pdf;base64,abc' }]
  }]),
  fetchSaldoVidas: () => Promise.resolve({ percentual_total: 80 })
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

jest.mock('../components/ui/dropdown-menu', () => {
  return {
    DropdownMenu: ({ children }) => <div data-testid="mock-dropdown">{children}</div>,
    DropdownMenuTrigger: ({ children, asChild }) => <div data-testid="mock-dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }) => <div data-testid="mock-dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children }) => <div data-testid="mock-dropdown-item">{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  };
});

import Chat from '../pages/Chat';
import TopNav from '../components/TopNav';
import Inclusao from '../pages/Inclusao';

describe('TDD: Decouple Movement Notifications from Chat & Render in Bell Icon', () => {
  test('RED/GREEN: Chat should not list movement notifications (protocolo)', async () => {
    render(<Chat session={{ role: 'operador', username: 'Operador Teste' }} />);
    
    // The normal chat message "Olá, preciso de ajuda com meu plano" should appear.
    expect(await screen.findByText('Olá, preciso de ajuda com meu plano')).toBeInTheDocument();
    
    // The movement notification should NOT appear in the chat conversation list.
    expect(screen.queryByText('Nova solicitação de Inclusão enviada pelo Portal do Cliente')).not.toBeInTheDocument();
  });

  test('RED/GREEN: TopNav bell icon should list movement notifications and download links when clicked', async () => {
    render(<TopNav />);
    
    // Wait for notifications to load or click bell.
    const bellBtn = await screen.findByRole('button', { name: /bell-btn/i || /sino/i });
    expect(bellBtn).toBeInTheDocument();
    
    fireEvent.click(bellBtn);
    
    // Should display the movement notification description inside the dropdown/popover.
    expect(await screen.findByText(/CLI-0357/)).toBeInTheDocument();
    expect(screen.getByText(/Nova solicitação de Inclusão enviada pelo Portal do Cliente/)).toBeInTheDocument();
    
    // Should have a download link for the attachment.
    const downloadLink = screen.getByText('documento_identidade.pdf');
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute('download', 'documento_identidade.pdf');
  });

  test('RED/GREEN: Inclusao page details modal should render attachments for the protocol', async () => {
    render(<Inclusao />);
    
    // Find the protocol button and click it to open the details dialog.
    const protocolBtn = await screen.findByRole('button', { name: 'CLI-0357' });
    expect(protocolBtn).toBeInTheDocument();
    
    fireEvent.click(protocolBtn);
    
    // The details dialog should show the attachment download link.
    expect(await screen.findByText('documento_identidade.pdf')).toBeInTheDocument();
  });
});
