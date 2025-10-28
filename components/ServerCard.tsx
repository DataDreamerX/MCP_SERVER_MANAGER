import React, { useState } from 'react';
import { ServerConfig, ServerStatus, VisibilityStatus } from '../types';
import { Icon } from './Icon';

interface ServerCardProps {
  server: ServerConfig;
  onToggleStatus: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onViewDetails: () => void;
}

const statusStyles: { [key in ServerStatus]: { dot: string; text: string; label: string } } = {
  [ServerStatus.ONLINE]: { dot: 'bg-green-500', text: 'text-green-600', label: 'Online' },
  [ServerStatus.OFFLINE]: { dot: 'bg-gray-400', text: 'text-gray-500', label: 'Offline' },
  [ServerStatus.STARTING]: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-600', label: 'Starting...' },
  [ServerStatus.STOPPING]: { dot: 'bg-red-400 animate-pulse', text: 'text-red-600', label: 'Stopping...' },
};

const formatDistanceToNow = (isoDate: string) => {
  const date = new Date(isoDate);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "just now";
};

export const ServerCard: React.FC<ServerCardProps> = ({ server, onToggleStatus, onDelete, onToggleVisibility, onViewDetails }) => {
  const { name, status, command, endpoint, transport, createdBy, lastModified, isPublic, tools, visibilityStatus } = server;
  const style = statusStyles[status];
  const isTransitioning = status === ServerStatus.STARTING || status === ServerStatus.STOPPING;
  const isVisibilityTransitioning = visibilityStatus && visibilityStatus !== VisibilityStatus.IDLE;
  const [commandCopied, setCommandCopied] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);

  const handleCopyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(command);
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  };
  
  const handleCopyEndpoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(endpoint);
    setEndpointCopied(true);
    setTimeout(() => setEndpointCopied(false), 2000);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md flex flex-col transition-transform duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-900 truncate pr-4">{name}</h3>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
            <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-1 flex items-center flex-wrap gap-x-2 gap-y-1">
          {isVisibilityTransitioning ? (
              <div className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 bg-yellow-100 text-yellow-800`}>
                <Icon name="spinner" className="w-3 h-3 animate-spin" />
                <span>{visibilityStatus}</span>
              </div>
          ) : (
            <div className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 ${isPublic ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                <Icon name={isPublic ? 'globe-alt' : 'lock-closed'} className="w-3 h-3" />
                <span>{isPublic ? 'Public' : 'Private'}</span>
            </div>
          )}
          <span className="flex-shrink-0 uppercase text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">{transport}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 flex-grow space-y-4">
        {/* Endpoint Section */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Endpoint</label>
          <div className="mt-1 group relative bg-gray-50 p-2 rounded-md flex items-center justify-between">
            <code className="text-blue-700 text-sm break-words overflow-x-auto pr-8">
              {endpoint}
            </code>
            <button
              onClick={handleCopyEndpoint}
              className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 bg-gray-50 group-hover:bg-gray-100 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Copy Endpoint"
            >
              {endpointCopied ? <Icon name="check" className="w-4 h-4 text-green-500" /> : <Icon name="copy" className="w-4 h-4" />}
            </button>
          </div>
        </div>
      
        {/* Command Section */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Command</label>
          <div className="mt-1 group relative bg-gray-50 p-2 rounded-md flex items-center justify-between">
            <code className="text-green-700 text-sm break-words overflow-x-auto pr-8">
              {command}
            </code>
            <button
              onClick={handleCopyCommand}
              className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 bg-gray-50 group-hover:bg-gray-100 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Copy Command"
            >
              {commandCopied ? <Icon name="check" className="w-4 h-4 text-green-500" /> : <Icon name="copy" className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tools and Stats Section */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span className="flex items-center"><Icon name="cpu-chip" className="w-4 h-4 mr-2 text-gray-400" />Available Tools</span>
            <span className="font-semibold">{status === ServerStatus.ONLINE ? (tools?.length ?? 0) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="bg-gray-50 p-3 flex justify-between items-center border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-gray-500 min-w-0">
            <div className="truncate">
                <span title={`Created by ${createdBy}`} className="font-semibold text-gray-700">{createdBy}</span>
                <span className="text-gray-400 mx-1.5" aria-hidden="true">&bull;</span>
                <span title={`Last updated: ${new Date(lastModified).toLocaleString()}`}>
                    Updated {formatDistanceToNow(lastModified)}
                </span>
            </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleVisibility}
            disabled={isVisibilityTransitioning}
            className={`p-2 rounded-full transition-colors duration-300 ${isVisibilityTransitioning ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}
            aria-label={isVisibilityTransitioning ? visibilityStatus : (isPublic ? 'Make Private' : 'Make Public')}
            title={isVisibilityTransitioning ? visibilityStatus : (isPublic ? 'Make Private' : 'Make Public')}
          >
            {isVisibilityTransitioning ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name={isPublic ? 'lock-closed' : 'globe-alt'} className="w-5 h-5" />}
          </button>
          <button
            onClick={onToggleStatus}
            disabled={isTransitioning}
            className={`p-2 rounded-full transition-colors duration-300 ${isTransitioning ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}
            aria-label={isTransitioning ? status : (status === ServerStatus.ONLINE ? 'Stop Server' : 'Start Server')}
            title={isTransitioning ? status : (status === ServerStatus.ONLINE ? 'Stop Server' : 'Start Server')}
          >
            {isTransitioning ? (
              <Icon name="spinner" className="w-5 h-5 animate-spin" />
            ) : status === ServerStatus.ONLINE ? (
              <Icon name="stop" className="w-5 h-5" />
            ) : (
              <Icon name="play" className="w-5 h-5" />
            )}
          </button>
          <button 
            onClick={onDelete}
            disabled={status !== ServerStatus.OFFLINE}
            className={`p-2 rounded-full transition-colors duration-300 ${
              status !== ServerStatus.OFFLINE
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-500 hover:bg-red-100 hover:text-red-600'
            }`}
            aria-label="Delete Server"
            title={status !== ServerStatus.OFFLINE ? 'Server must be offline to be deleted' : 'Delete Server'}
          >
            <Icon name="trash" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};