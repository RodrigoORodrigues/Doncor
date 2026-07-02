import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (endPage - startPage < 4) {
    if (startPage === 1) endPage = Math.min(totalPages, 5);
    else startPage = Math.max(1, totalPages - 4);
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  const btn = (onClick, disabled, children, active = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '4px 10px', border: '1px solid ' + (active ? '#4979bb' : '#d8e2ef'),
      borderRadius: '4px', cursor: disabled ? 'default' : 'pointer',
      background: active ? '#4979bb' : '#fff', color: active ? '#fff' : disabled ? '#b0b7c3' : '#344050',
      fontSize: '0.75rem', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center',
      transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
      <span>Exibindo {start}-{end} de {totalItems} registros</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {btn(() => onPageChange(1), currentPage === 1, <ChevronsLeft size={14} />)}
        {btn(() => onPageChange(currentPage - 1), currentPage === 1, <ChevronLeft size={14} />)}
        {pages.map(p => btn(() => onPageChange(p), false, p, p === currentPage))}
        {btn(() => onPageChange(currentPage + 1), currentPage === totalPages, <ChevronRight size={14} />)}
        {btn(() => onPageChange(totalPages), currentPage === totalPages, <ChevronsRight size={14} />)}
      </div>
    </div>
  );
};

export default Pagination;
