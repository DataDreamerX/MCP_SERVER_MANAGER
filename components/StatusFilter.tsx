import React from 'react';
import { ServerStatus } from '../types';

type StatusFilterType = 'All' | ServerStatus;

interface StatusFilterProps {
  currentFilter: StatusFilterType;
  onFilterChange: (filter: StatusFilterType) => void;
  serverCounts: { [key: string]: number };
}

const FILTERS: Array<StatusFilterType> = ['All', ...Object.values(ServerStatus)];

const filterDisplayNames: { [key in StatusFilterType]: string } = {
  All: 'All',
  [ServerStatus.ONLINE]: 'Online',
  [ServerStatus.OFFLINE]: 'Offline',
  [ServerStatus.STARTING]: 'Starting',
  [ServerStatus.STOPPING]: 'Stopping',
}

export const StatusFilter: React.FC<StatusFilterProps> = ({ currentFilter, onFilterChange, serverCounts }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 pb-4">
      {FILTERS.map(filter => {
        const isActive = currentFilter === filter;
        const count = serverCounts[filter] ?? 0;
        return (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 flex items-center space-x-2 ${
              isActive
                ? 'bg-green-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <span>{filterDisplayNames[filter]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};