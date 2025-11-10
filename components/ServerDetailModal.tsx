import React, { useState } from 'react';
import { ServerConfig, ServerStatus, VisibilityStatus } from '../types';
import { Icon } from './Icon';

interface ServerDetailPageProps {
  server: ServerConfig;
  onReturnToList: () => void;
  onToggleStatus: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

const statusStyles: { [key in ServerStatus]: { dot: string; text: string; label: string } } = {
  [ServerStatus.ONLINE]: { dot: 'bg-green-500', text: 'text-green-600', label: 'Online' },
  [ServerStatus.OFFLINE]: { dot: 'bg-gray-400', text: 'text-gray-500', label: 'Offline' },
  [ServerStatus.STARTING]: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-600', label: 'Starting...' },
  [ServerStatus.STOPPING]: { dot: 'bg-red-400 animate-pulse', text: 'text-red-600', label: 'Stopping...' },
};

const formatReadableDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CopyableField: React.FC<{ label: string; value: string; codeStyle?: string; }> = ({ label, value, codeStyle = 'text-gray-700' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
      <div className="mt-1 group relative bg-gray-100 p-3 rounded-md flex items-center justify-between border border-gray-200">
        <code className={`text-sm break-words overflow-x-auto pr-8 font-mono ${codeStyle}`}>
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 bg-gray-100 group-hover:bg-gray-200 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Icon name="check" className="w-4 h-4 text-green-500" /> : <Icon name="copy" className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const ServerDetailPage: React.FC<ServerDetailPageProps> = ({ server, onReturnToList, onToggleStatus, onToggleVisibility, onDelete }) => {
  if (!server) return null;

  const { name, status, command, endpoint, transport, createdBy, lastModified, isPublic, tools, maxAgents, visibilityStatus } = server;
  const style = statusStyles[status];
  const hasTools = tools && tools.length > 0;
  const isTransitioning = status === ServerStatus.STARTING || status === ServerStatus.STOPPING;
  const isVisibilityTransitioning = visibilityStatus && visibilityStatus !== VisibilityStatus.IDLE;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <button onClick={onReturnToList} className="flex items-center space-x-2 text-green-600 hover:text-green-800 font-semibold transition-colors group mb-4">
          <Icon name="arrow-left" className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Servers</span>
        </button>
        <div className="p-5 border border-gray-200 bg-white rounded-lg shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
                    <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1">
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
                          <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
                        </div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 ${isPublic ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            <Icon name={isPublic ? 'globe-alt' : 'lock-closed'} className="w-3 h-3" />
                            <span>{isPublic ? 'Public' : 'Private'}</span>
                        </div>
                        <span className="flex-shrink-0 uppercase text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">{transport}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={onToggleVisibility}
                    disabled={isVisibilityTransitioning}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 disabled:cursor-not-allowed ${
                        isVisibilityTransitioning
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    aria-label={isVisibilityTransitioning ? visibilityStatus : (isPublic ? 'Make Private' : 'Make Public')}
                  >
                    {isVisibilityTransitioning ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={isPublic ? 'lock-closed' : 'globe-alt'} className="w-4 h-4" />}
                    <span>{isVisibilityTransitioning ? visibilityStatus : (isPublic ? 'Make Private' : 'Make Public')}</span>
                  </button>
                  <button
                    onClick={onToggleStatus}
                    disabled={isTransitioning}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 disabled:cursor-not-allowed ${
                        isTransitioning
                          ? 'bg-yellow-100 text-yellow-800'
                          : status === ServerStatus.ONLINE
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                    aria-label={isTransitioning ? status : (status === ServerStatus.ONLINE ? 'Stop Server' : 'Start Server')}
                  >
                    {isTransitioning ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={status === ServerStatus.ONLINE ? 'stop' : 'play'} className="w-4 h-4" />}
                    <span>{isTransitioning ? status : (status === ServerStatus.ONLINE ? 'Stop' : 'Start')}</span>
                  </button>
                  <button 
                    onClick={onDelete}
                    disabled={status !== ServerStatus.OFFLINE}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 bg-red-100 text-red-800 hover:bg-red-200`}
                    aria-label="Delete Server"
                    title={status !== ServerStatus.OFFLINE ? 'Server must be offline to be deleted' : 'Delete Server'}
                  >
                    <Icon name="trash" className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
            </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="space-y-6">
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h2 className="text-xl font-bold text-gray-800 mb-4">Connection Details</h2>
           <div className="space-y-4">
              <CopyableField label="Endpoint" value={endpoint} codeStyle="text-blue-700" />
              <CopyableField label="Command" value={command} codeStyle="text-green-700" />
           </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase">Created By</p>
                <p className="text-gray-800 truncate mt-1 font-medium">{createdBy}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase">Last Modified</p>
                <p className="text-gray-800 truncate mt-1 font-medium">{formatReadableDate(lastModified)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase">Max Agents</p>
                <p className="text-gray-800 font-semibold text-lg mt-1">{maxAgents}</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Icon name="wrench-screwdriver" className="w-5 h-5 mr-2 text-gray-500" />
              Available Tools
              <span className="ml-3 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                {tools?.length ?? 0}
              </span>
            </h3>
            {hasTools ? (
                <div className="space-y-3">
                    {tools.map((tool, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-bold text-green-700">{tool.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                            {tool.args && tool.args.length > 0 && (
                                <div className="mt-3">
                                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Arguments</h5>
                                    <ul className="mt-2 space-y-2 text-sm">
                                        {tool.args.map((arg, argIndex) => (
                                            <li key={argIndex} className="flex items-start">
                                                <code className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-md font-semibold text-xs">{arg.name}</code>
                                                <span className="text-gray-400 mx-2 text-xs self-center">&bull;</span>
                                                <span className="text-blue-600 font-mono text-xs self-center">{arg.type}</span>
                                                <span className="text-gray-400 mx-2 text-xs self-center">&bull;</span>
                                                <span className="text-gray-500 flex-1">{arg.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Icon name="cpu-chip" className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No tools available for this server.</p>
                </div>
            )}
        </section>
      </main>
    </div>
  );
};