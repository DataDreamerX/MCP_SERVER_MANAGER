import React, { useState, useEffect } from 'react';
import { ServerConfig, TransportType, SourceFile, Tool } from '../types';
import { TRANSPORT_TYPES } from '../constants';
import { suggestServerName } from '../services/geminiService';
import { Icon } from './Icon';

interface ServerFormProps {
  initialData: ServerConfig | null;
  onSave: (data: Omit<ServerConfig, 'id' | 'status' | 'agentsRunning' | 'createdBy' | 'lastModified'>) => void;
  onCancel: () => void;
}

export const ServerForm: React.FC<ServerFormProps> = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [transport, setTransport] = useState<TransportType>(TransportType.SSE);
  const [endpoint, setEndpoint] = useState('');
  const [maxAgents, setMaxAgents] = useState(10);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [tools, setTools] = useState('');
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCommand(initialData.command)
      setTransport(initialData.transport);
      setEndpoint(initialData.endpoint);
      setMaxAgents(initialData.maxAgents);
      setSourceFiles(initialData.sourceFiles || []);
      setTools(initialData.tools ? JSON.stringify(initialData.tools, null, 2) : '');
      setIsPublic(initialData.isPublic || false);
    } else {
      // Reset form for creation
      setName('');
      setCommand('');
      setTransport(TransportType.SSE);
      setEndpoint('N/A');
      setMaxAgents(10);
      setSourceFiles([]);
      setTools('');
      setIsPublic(false);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      if (!name.trim() || !endpoint.trim() || !command.trim()) {
        alert("Server name, endpoint, and command cannot be empty.");
        return;
      }
    } else {
      if (!name.trim() || !command.trim()) {
        alert("Server name and command cannot be empty.");
        return;
      }
    }
    
    let toolsArray: Tool[] = [];
    if (tools.trim()) {
      try {
        toolsArray = JSON.parse(tools);
      } catch (error) {
        alert("The tools field contains invalid JSON. Please correct it or leave it empty.");
        return;
      }
    }

    onSave({ 
        name, 
        command, 
        transport, 
        endpoint, 
        maxAgents, 
        sourceFiles,
        isPublic,
        tools: toolsArray,
    });
  };

  const handleSuggestName = async () => {
    setIsSuggestingName(true);
    try {
      const suggestedName = await suggestServerName();
      setName(suggestedName);
    } catch (error) {
      console.error("Failed to suggest name", error);
    } finally {
      setIsSuggestingName(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        // Fix: Explicitly type `file` as `File` to resolve type errors.
        const filePromises = Array.from(files).map((file: File) => {
            return new Promise<SourceFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    const path = (file as any).webkitRelativePath || file.name;
                    resolve({ path, content });
                };
                reader.onerror = (error) => reject(error);
                reader.readAsText(file);
            });
        });
        
        try {
            const uploadedFiles = await Promise.all(filePromises);
            setSourceFiles(uploadedFiles);
        } catch (error) {
            console.error("Error reading folder:", error);
            alert("There was an error reading the folder.");
        }
    }
  };
  
  const handleRemoveFiles = () => {
      setSourceFiles([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{initialData ? 'Edit Server' : 'Create New Server'}</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="server-name" className="block text-sm font-medium text-gray-600 mb-1">Server Name</label>
            <div className="flex items-center space-x-2">
                <input
                    id="server-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    placeholder="e.g., Synapse Grid"
                    required
                />
                <button type="button" onClick={handleSuggestName} disabled={isSuggestingName} className="p-2 bg-green-600 hover:bg-green-500 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-wait" aria-label="Suggest Name">
                  {isSuggestingName ? <Icon name="loader" className="w-5 h-5 animate-spin text-white" /> : <Icon name="sparkles" className="w-5 h-5 text-white" />}
                </button>
            </div>
          </div>

          <div>
            <label htmlFor="command" className="block text-sm font-medium text-gray-600 mb-1">Server Command</label>
            <textarea
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition font-mono text-sm"
                placeholder="e.g., mcp-server --port 8080 --mode=production"
                required
                rows={3}
            />
          </div>
          
          {initialData && (
            <>
              <div>
                <label htmlFor="endpoint" className="block text-sm font-medium text-gray-600 mb-1">Endpoint URL</label>
                <input
                    id="endpoint"
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    placeholder="e.g., 127.0.0.1:8000 or api.domain.com"
                    required
                />
              </div>

              <div>
                <label htmlFor="tools" className="block text-sm font-medium text-gray-600 mb-1">Tools (JSON format, optional)</label>
                <textarea
                    id="tools"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition font-mono text-sm"
                    placeholder={`[
      {
        "name": "tool-name",
        "description": "Tool description.",
        "args": [
          { "name": "arg1", "type": "string", "description": "Arg description." }
        ]
      }
    ]`}
                    rows={6}
                />
              </div>
            </>
          )}
          
          <div>
              <label htmlFor="transport" className="block text-sm font-medium text-gray-600 mb-1">Transport</label>
              <select id="transport" value={transport} onChange={(e) => setTransport(e.target.value as TransportType)} className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition">
                {TRANSPORT_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
              </select>
          </div>
          
           {initialData && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Source Code (Optional)</label>
                {sourceFiles.length > 0 ? (
                    <div className="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2 border border-gray-200">
                        <div className="flex items-center space-x-2 text-gray-700 truncate">
                            <Icon name="folder" className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{sourceFiles.length} file{sourceFiles.length > 1 ? 's' : ''} uploaded</span>
                        </div>
                        <button type="button" onClick={handleRemoveFiles} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remove files">
                          <Icon name="trash" className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-md px-6 py-4 flex justify-center items-center">
                        <input
                            type="file"
                            id="folder-upload"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            {...{ webkitdirectory: "", directory: "" }}
                        />
                        <label htmlFor="folder-upload" className="flex flex-col items-center space-y-1 text-center cursor-pointer">
                            <Icon name="folder-plus" className="w-8 h-8 text-gray-400" />
                            <span className="font-medium text-green-600">Upload a folder</span>
                            <span className="text-xs text-gray-500">or drag and drop</span>
                        </label>
                    </div>
                )}
              </div>

              <div>
                <label htmlFor="max-agents" className="block text-sm font-medium text-gray-600 mb-1">Max Concurrent Agents: {maxAgents}</label>
                <input
                  id="max-agents"
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={maxAgents}
                  onChange={(e) => setMaxAgents(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </>
           )}

          <div>
            <label className="block text-sm font-medium text-gray-600">Visibility</label>
            <div className="flex items-center justify-between mt-1 bg-gray-50 rounded-md p-3 border border-gray-200">
                <div>
                    <p className="font-semibold text-gray-800">{isPublic ? 'Public Server' : 'Private Server'}</p>
                    <p className="text-xs text-gray-500">{isPublic ? 'Visible and accessible on the public internet.' : 'Only accessible by authenticated users.'}</p>
                </div>
                <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`${isPublic ? 'bg-green-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                role="switch"
                aria-checked={isPublic}
                >
                <span className={`${isPublic ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors border border-gray-300">
          Cancel
        </button>
        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          {initialData ? 'Save Changes' : 'Create Server'}
        </button>
      </div>
    </form>
  );
};
