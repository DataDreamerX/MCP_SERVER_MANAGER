import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
  oncreateServer: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ oncreateServer, searchQuery, onSearchChange }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 pb-4 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <Icon name="server" className="w-8 h-8 text-green-500" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          MCP Server Manager
        </h1>
      </div>
      <div className="flex items-center space-x-4 w-full md:w-auto">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon name="search" className="w-5 h-5 text-gray-500" />
          </span>
          <input
            type="search"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white text-gray-900 rounded-md pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
          />
        </div>
        <button 
          onClick={oncreateServer}
          className="flex-shrink-0 flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg hover:shadow-green-500/50"
        >
          <Icon name="plus" className="w-5 h-5" />
          <span>Create Server</span>
        </button>
      </div>
    </header>
  );
};