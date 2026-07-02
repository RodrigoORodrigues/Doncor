import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Componente para proteger rotas baseadas em autenticação e papéis (RBAC).
 * @param {Array} allowedRoles - Lista de papéis permitidos (ex: ['admin', 'agente'])
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não estiver logado, redireciona para o login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver logado mas o papel não for permitido
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return children;
};

export default ProtectedRoute;
