import React, { useState } from 'react';
import { ServerConfig, ServerStatus } from '../types';
import { Icon } from './Icon';

interface ServerDetailModalProps {
  server: ServerConfig;
  onClose: () => void;
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
      <div className="mt-1 group relative bg-gray-50 p-3 rounded-md flex items-center justify-between">
        <code className={`text-sm break-words overflow-x-auto pr-8 font-mono ${codeStyle}`}>
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 bg-gray-50 group-hover:bg-gray-100 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Icon name="check" className="w-4 h-4 text-green-500" /> : <Icon name="copy" className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const ServerDetailModal: React.FC<ServerDetailModalProps> = ({ server, onClose }) => {
  if (!server) return null;

  const { name, status, command, endpoint, transport, createdBy, lastModified, isPublic, tools, maxAgents } = server;
  const style = statusStyles[status];
  const hasTools = tools && tools.length > 0;

  return (
    <div className="flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
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
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                <Icon name="x-mark" className="w-6 h-6" />
            </button>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6">
        <div className="space-y-4">
          <CopyableField label="Endpoint" value={endpoint} codeStyle="text-blue-700" />
          <CopyableField label="Command" value={command} codeStyle="text-green-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs font-semibold text-gray-500 uppercase">Created By</p>
                <p className="text-gray-800 truncate mt-1">{createdBy}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs font-semibold text-gray-500 uppercase">Last Modified</p>
                <p className="text-gray-800 truncate mt-1">{formatReadableDate(lastModified)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs font-semibold text-gray-500 uppercase">Max Agents</p>
                <p className="text-gray-800 font-semibold text-lg mt-1">{maxAgents}</p>
            </div>
        </div>
        
        {/* Tools Section */}
        <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Icon name="wrench-screwdriver" className="w-5 h-5 mr-2 text-gray-500" />
              Available Tools
            </h3>
            {hasTools ? (
                <div className="space-y-3">
                    {tools.map((tool, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 className="font-bold text-green-700">{tool.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                            {tool.args && tool.args.length > 0 && (
                                <div className="mt-3">
                                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Arguments</h5>
                                    <ul className="mt-2 space-y-2 text-sm">
                                        {tool.args.map((arg, argIndex) => (
                                            <li key={argIndex} className="flex items-start">
                                                <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-semibold text-xs">{arg.name}</code>
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
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Icon name="cpu-chip" className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No tools available for this server.</p>
                </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
        <button 
          type="button" 
          onClick={onClose} 
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
