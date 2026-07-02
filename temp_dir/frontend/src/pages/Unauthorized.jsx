import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-red-500 text-6xl font-bold">403</div>
        <h1 className="text-3xl font-bold text-gray-900">Acesso Negado</h1>
        <p className="text-gray-600">
          Você não tem permissão para acessar esta página. Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
        </p>
        <div className="pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
