
import React, { useState, useEffect } from 'react';
import { ServerConfig, TransportType, Tool, ToolArg } from '../types';
import { Icon } from './Icon';

interface ServerFormProps {
  initialData: ServerConfig | null;
  onSave: (data: Omit<ServerConfig, 'id' | 'status' | 'agentsRunning' | 'createdBy' | 'lastModified'>) => void;
  onCancel: () => void;
}

type ToolTypeOption = 'azure' | 'neo4j' | 'python' | 'rest-api';
type TabOption = 'managed' | 'remote';

interface FormTool {
  id: number;
  name: string;
  type: ToolTypeOption;
  index: string;
  description: string;
  code?: string;
  method?: string;
  endpoint?: string;
  params: {
    skip: boolean;
    top: boolean;
    facet: boolean;
    filter: boolean;
  };
}

const defaultParams = { skip: false, top: false, facet: false, filter: false };
const CURRENT_SDK_VERSION = '1.4.2';

export const ServerForm: React.FC<ServerFormProps> = ({ initialData, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<TabOption>('managed');

  // Managed Server State
  const [name, setName] = useState('');
  const [tools, setTools] = useState<FormTool[]>([]);
  
  // New Tool State
  const [newToolName, setNewToolName] = useState('');
  const [newToolType, setNewToolType] = useState<ToolTypeOption>('azure');
  const [newToolIndex, setNewToolIndex] = useState('');
  const [newToolCode, setNewToolCode] = useState('');
  const [newToolMethod, setNewToolMethod] = useState('GET');
  const [newToolEndpoint, setNewToolEndpoint] = useState('');
  const [newToolDescription, setNewToolDescription] = useState('');
  const [newToolParams, setNewToolParams] = useState(defaultParams);
  const [toolIdCounter, setToolIdCounter] = useState(0);
  const [toolNameError, setToolNameError] = useState<string | null>(null);

  // Remote Server State
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteToken, setRemoteToken] = useState('');
  const [remoteTransport, setRemoteTransport] = useState<TransportType>(TransportType.SSE);

  useEffect(() => {
    if (initialData) {
      // Determine if the server is remote based on type property, command or presence of token
      const isRemote = initialData.type === 'remote' || initialData.command === 'Remote Connection' || !!initialData.bearerToken;
      setActiveTab(isRemote ? 'remote' : 'managed');

      if (isRemote) {
        setRemoteName(initialData.name);
        setRemoteUrl(initialData.endpoint);
        setRemoteToken(initialData.bearerToken || '');
        setRemoteTransport(initialData.transport);
      } else {
        setName(initialData.name);
        let parsedTools: FormTool[] = [];
        const commandToolsMatch = initialData.command.match(/--tools '([^']+)'/);

        if (commandToolsMatch && commandToolsMatch[1]) {
          try {
            const commandTools = JSON.parse(commandToolsMatch[1]);
            parsedTools = commandTools.map((cmdTool: any, idx: number) => ({
              id: idx,
              name: cmdTool.name,
              type: cmdTool.type,
              index: cmdTool.index || '',
              code: cmdTool.code || '',
              method: cmdTool.method || 'GET',
              endpoint: cmdTool.endpoint || '',
              description: cmdTool.description || '',
              params: { ...defaultParams, ...(cmdTool.params || {}) },
            }));
          } catch (e) {
            console.warn("Could not parse tools from command, falling back.", e);
          }
        }
        
        if (parsedTools.length === 0 && initialData.tools) {
          parsedTools = (initialData.tools || []).map((tool, idx) => {
            const indexMatch = tool.description.match(/from the '([^']+)' index/);
            const typeMatch = tool.description.match(/using (Azure AI Search|Neo4j)/);
            let type: ToolTypeOption = 'azure';
            if (typeMatch && typeMatch[1] === 'Neo4j') type = 'neo4j';
            // Simple heuristic for python tools if we fall back to metadata parsing, though code is usually only in command
            if (!typeMatch && !indexMatch) {
                // Potential python tool if we can't identify others, but without code it's incomplete. 
                // We'll treat as azure default if unknown for legacy safety, or maybe skip.
            }

            const hasArg = (name: string) => tool.args?.some(arg => arg.name === name);
            return {
              id: idx,
              name: tool.name,
              type: type,
              index: indexMatch ? indexMatch[1] : '',
              description: tool.description,
              params: {
                skip: hasArg('skip'),
                top: hasArg('top') || hasArg('top_k'),
                facet: hasArg('facet'),
                filter: hasArg('filter'),
              },
            };
          }).filter(t => t.index || t.type === 'python' || t.type === 'rest-api'); 
        }

        setTools(parsedTools);
        setToolIdCounter(parsedTools.length);
      }
    } else {
      // Reset all states
      setActiveTab('managed');
      setName('');
      setTools([]);
      setToolIdCounter(0);
      setRemoteName('');
      setRemoteUrl('');
      setRemoteToken('');
      setRemoteTransport(TransportType.SSE);
    }
  }, [initialData]);

  useEffect(() => {
    if (newToolType === 'python') {
        setToolNameError(null);
        return;
    }

    if (newToolName.trim() && !/^[a-zA-Z0-9_]+$/.test(newToolName.trim())) {
      setToolNameError('Name can only contain letters, numbers, and underscores.');
    } else if (newToolName.trim() && tools.some(tool => tool.name.trim().toLowerCase() === newToolName.trim().toLowerCase())) {
      setToolNameError('A tool with this name already exists.');
    } else {
      setToolNameError(null);
    }
  }, [newToolName, tools, newToolType]);

  const isAddToolDisabled = (() => {
    if (newToolType === 'python') return !newToolCode.trim();
    if (newToolType === 'rest-api') return !newToolName.trim() || !!toolNameError || !newToolEndpoint.trim();
    return !newToolName.trim() || !!toolNameError || !newToolIndex.trim();
  })();

  const handleAddTool = () => {
    if (isAddToolDisabled) return;
    
    let toolName = newToolName.trim();
    let toolDesc = newToolDescription.trim();

    if (newToolType === 'python') {
        // Extract function name from code, e.g. "def my_function(args):"
        const nameMatch = newToolCode.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        toolName = nameMatch ? nameMatch[1] : `python_fn_${toolIdCounter}`;
        // Python tools don't need a manually entered description for now
        toolDesc = ''; 
    }

    setTools(prev => [...prev, {
      id: toolIdCounter,
      name: toolName,
      type: newToolType,
      index: newToolIndex.trim(),
      code: newToolType === 'python' ? newToolCode : undefined,
      method: newToolType === 'rest-api' ? newToolMethod : undefined,
      endpoint: newToolType === 'rest-api' ? newToolEndpoint : undefined,
      description: toolDesc,
      params: newToolParams,
    }]);
    setToolIdCounter(prev => prev + 1);

    setNewToolName('');
    setNewToolType('azure');
    setNewToolIndex('');
    setNewToolCode('');
    setNewToolMethod('GET');
    setNewToolEndpoint('');
    setNewToolDescription('');
    setNewToolParams(defaultParams);
  };

  const handleRemoveTool = (idToRemove: number) => {
    setTools(prev => prev.filter(tool => tool.id !== idToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'managed') {
        if (!name.trim()) {
          alert("Server Name is required.");
          return;
        }
        if (tools.length === 0) {
          alert("At least one tool must be added.");
          return;
        }

        const toolsForCommand = tools.map(({ id, ...rest }) => rest);
        const command = `mcp-sdk-runner --sdk-version ${CURRENT_SDK_VERSION} --tools '${JSON.stringify(toolsForCommand)}'`;
        
        const serverTools: Tool[] = tools.map(tool => {
            if (tool.type === 'python') {
                return {
                    name: tool.name,
                    description: tool.description || 'Custom Python function.',
                    args: [] // Arguments are defined in the code
                };
            }
            
            if (tool.type === 'rest-api') {
                return {
                    name: tool.name,
                    description: tool.description || `Makes a ${tool.method} request to ${tool.endpoint}`,
                    args: [
                        {
                            name: tool.method === 'GET' ? 'params' : 'object',
                            type: 'object',
                            description: tool.method === 'GET' 
                                ? 'Query parameters for the request.' 
                                : 'JSON body for the request.'
                        }
                    ]
                };
            }

            const toolNameDisplay = tool.type === 'azure' ? 'Azure AI Search' : 'Neo4j';
            const defaultDescription = `Retrieves data from the '${tool.index}' index using ${toolNameDisplay}.`;
            const args: ToolArg[] = [{ name: 'query', type: 'string', description: 'The search query.' }];
            
            if (tool.params.skip) args.push({ name: 'skip', type: 'integer', description: 'Number of records to skip for pagination.' });
            if (tool.params.top) args.push({ name: 'top', type: 'integer', description: 'The number of results to return.' });
            if (tool.params.facet) args.push({ name: 'facet', type: 'string', description: 'A field to use for faceting results.' });
            if (tool.params.filter) args.push({ name: 'filter', type: 'string', description: 'OData filter expression.' });
            
            return {
                name: tool.name,
                description: tool.description || defaultDescription,
                args: args
            };
        });

        // Isolated Managed Server Data
        const serverData = {
            type: 'managed' as const,
            name,
            command,
            tools: serverTools,
            transport: initialData?.transport || TransportType.SSE,
            endpoint: initialData?.endpoint || `api.${name.toLowerCase().replace(/\s+/g, '-')}.mcp.com`,
            maxAgents: initialData?.maxAgents || 10,
            sourceFiles: initialData?.sourceFiles || [],
            isPublic: initialData?.isPublic || false,
            sdkVersion: CURRENT_SDK_VERSION,
            bearerToken: undefined, // Ensure remote fields are not included/undefined
        };
        onSave(serverData);
    } else {
        // Remote Server Submit Logic
        if (!remoteName.trim()) {
            alert("Server Name is required.");
            return;
        }
        if (!remoteUrl.trim()) {
            alert("Server URL is required.");
            return;
        }

        // Isolated Remote Server Data
        const serverData = {
            type: 'remote' as const,
            name: remoteName,
            command: 'Remote Connection',
            tools: [], // Remote servers don't use the managed tools array
            transport: remoteTransport,
            endpoint: remoteUrl,
            bearerToken: remoteToken || undefined,
            maxAgents: 0,
            sourceFiles: [],
            isPublic: initialData?.isPublic || false,
            sdkVersion: undefined, // Managed specific field
        };
        onSave(serverData);
    }
  };

  const getTypeBadgeColor = (type: ToolTypeOption) => {
    switch (type) {
        case 'python': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'rest-api': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'neo4j': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
        case 'GET': return 'bg-blue-100 text-blue-800';
        case 'POST': return 'bg-green-100 text-green-800';
        case 'DELETE': return 'bg-red-100 text-red-800';
        case 'PUT': return 'bg-orange-100 text-orange-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl">
      {/* Modal Header */}
      <div className="px-8 py-5 flex justify-between items-center border-b border-gray-100 bg-white z-10">
        <div>
            <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Edit Server Configuration' : 'Create New Server'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Configure your MCP server settings and tools.</p>
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Icon name="x-mark" className="w-6 h-6" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="px-8 border-b border-gray-100 bg-gray-50/50">
         <div className="flex space-x-6">
            <button
                type="button"
                onClick={() => setActiveTab('managed')}
                className={`py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'managed' 
                    ? 'border-green-600 text-green-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                Managed MCP
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('remote')}
                className={`py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'remote' 
                    ? 'border-green-600 text-green-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                Remote MCP
            </button>
         </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-grow overflow-y-auto bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
            {activeTab === 'managed' ? (
                <div className="space-y-8">
                    {/* Server Name Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <label htmlFor="server-name" className="block text-sm font-semibold text-gray-700 mb-2">
                            Server Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="server-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full max-w-lg bg-white text-gray-900 rounded-lg px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition shadow-sm placeholder-gray-400"
                            placeholder="e.g., Enterprise Knowledge Graph"
                            required
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Unique identifier for your server on the network.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
                        {/* Left Column: Tool Builder (7 columns) */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Tool Builder</h3>
                            </div>
                            
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                                {/* Service Type Selector */}
                                <div>
                                    <label htmlFor="tool-type" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Type</label>
                                    <div className="relative">
                                        <select 
                                            id="tool-type" 
                                            value={newToolType} 
                                            onChange={e => setNewToolType(e.target.value as ToolTypeOption)} 
                                            className="appearance-none w-full bg-gray-50 text-gray-900 rounded-lg px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition font-medium cursor-pointer"
                                        >
                                            <option value="azure">Azure AI Search</option>
                                            <option value="neo4j">Neo4j Graph Database</option>
                                            <option value="rest-api">REST API Endpoint</option>
                                            <option value="python">Python Function</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                            <Icon name="settings" className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-100 pt-6 space-y-5">
                                    {/* Python Specific Fields */}
                                    {newToolType === 'python' && (
                                        <div>
                                            <label htmlFor="tool-code" className="block text-sm font-medium text-gray-700 mb-2">Python Function Code</label>
                                            <div className="relative">
                                                <textarea
                                                    id="tool-code"
                                                    rows={10}
                                                    value={newToolCode}
                                                    onChange={e => setNewToolCode(e.target.value)}
                                                    placeholder={`def calculate_metrics(data: str):\n    """Calculates key performance metrics."""\n    # Your implementation here\n    return {"status": "ok"}`}
                                                    className="w-full bg-slate-900 text-green-400 rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm leading-relaxed"
                                                    spellCheck={false}
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <span className="text-xs text-slate-500 font-mono">Python 3.9</span>
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Define a function. The function name and docstring will be used as the tool name and description.
                                            </p>
                                        </div>
                                    )}

                                    {/* REST API Specific Fields */}
                                    {newToolType === 'rest-api' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                            <div className="sm:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                                                <select
                                                    value={newToolMethod}
                                                    onChange={e => setNewToolMethod(e.target.value)}
                                                    className="w-full bg-white text-gray-900 rounded-lg px-3 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                                >
                                                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint URL</label>
                                                <input
                                                    type="url"
                                                    value={newToolEndpoint}
                                                    onChange={e => setNewToolEndpoint(e.target.value)}
                                                    placeholder="https://api.example.com/resource"
                                                    className="w-full bg-white text-gray-900 rounded-lg px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Azure/Neo4j Specific Fields */}
                                    {newToolType !== 'python' && newToolType !== 'rest-api' && (
                                        <div>
                                            <label htmlFor="index-name" className="block text-sm font-medium text-gray-700 mb-2">Index Name</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Icon name="folder" className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input 
                                                    id="index-name" 
                                                    type="text" 
                                                    value={newToolIndex} 
                                                    onChange={e => setNewToolIndex(e.target.value)} 
                                                    placeholder="e.g., product-catalog" 
                                                    className="w-full bg-white text-gray-900 rounded-lg pl-10 pr-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Common Name/Desc Fields (except Python) */}
                                    {newToolType !== 'python' && (
                                        <>
                                            <div className="grid grid-cols-1 gap-5">
                                                <div>
                                                    <label htmlFor="tool-name" className="block text-sm font-medium text-gray-700 mb-2">Tool Name</label>
                                                    <input
                                                        id="tool-name"
                                                        type="text"
                                                        value={newToolName}
                                                        onChange={e => setNewToolName(e.target.value)}
                                                        placeholder="e.g., search_products"
                                                        className={`w-full bg-white text-gray-900 rounded-lg px-4 py-2.5 border focus:outline-none focus:ring-2 transition ${toolNameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                                                    />
                                                    {toolNameError && <p className="text-red-500 text-xs mt-1 flex items-center"><Icon name="x-mark" className="w-3 h-3 mr-1"/>{toolNameError}</p>}
                                                </div>
                                                <div>
                                                    <label htmlFor="tool-description" className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                                                    <textarea
                                                        id="tool-description"
                                                        rows={3}
                                                        value={newToolDescription}
                                                        onChange={e => setNewToolDescription(e.target.value)}
                                                        placeholder="Describe what this tool does..."
                                                        className="w-full bg-white text-gray-900 rounded-lg px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition resize-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Parameters (Azure/Neo4j only) */}
                                            {newToolType !== 'rest-api' && (
                                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Optional Parameters</label>
                                                    <div className="flex flex-wrap gap-4">
                                                        <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-not-allowed select-none">
                                                            <div className="w-5 h-5 rounded border border-gray-300 bg-gray-100 flex items-center justify-center">
                                                                <Icon name="check" className="w-3 h-3 text-gray-400" />
                                                            </div>
                                                            <span className="font-mono">query</span>
                                                        </label>
                                                        {(['skip', 'top', 'facet', 'filter'] as const).map(param => (
                                                            <label key={param} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer group">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={newToolParams[param]}
                                                                    onChange={(e) => setNewToolParams(p => ({ ...p, [param]: e.target.checked }))}
                                                                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer transition"
                                                                />
                                                                <span className="font-mono group-hover:text-green-700 transition-colors">{param}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex justify-end pt-2">
                                         <button 
                                          type="button"
                                          onClick={handleAddTool}
                                          disabled={isAddToolDisabled}
                                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-95"
                                        >
                                            <Icon name="plus" className="w-5 h-5" />
                                            <span>Add Tool to Server</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: List of added tools (5 columns) */}
                        <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Configured Tools</h3>
                                 <span className="text-xs font-bold bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
                                    {tools.length} Ready
                                </span>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 flex-grow shadow-sm overflow-hidden flex flex-col">
                                {tools.length > 0 ? (
                                  <div className="overflow-y-auto p-4 space-y-4 max-h-[600px]">
                                    {tools.map((tool) => (
                                      <div key={tool.id} className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200">
                                          {/* Card Header */}
                                          <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between bg-gray-50/30">
                                              <div className="flex flex-col">
                                                  <div className="flex items-center gap-2 mb-1">
                                                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getTypeBadgeColor(tool.type)}`}>
                                                         {tool.type === 'rest-api' ? 'REST' : tool.type}
                                                     </span>
                                                     <span className="font-bold text-gray-900 text-sm">{tool.name}</span>
                                                  </div>
                                              </div>
                                              <button 
                                                type="button" 
                                                onClick={() => handleRemoveTool(tool.id)} 
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove tool"
                                              >
                                                  <Icon name="trash" className="w-4 h-4" />
                                              </button>
                                          </div>
                                          
                                          {/* Card Body */}
                                          <div className="p-4">
                                              {tool.description && (
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tool.description}</p>
                                              )}
                                              
                                              {tool.type === 'python' ? (
                                                  <div className="mt-2 bg-slate-50 rounded-md border border-slate-100 p-2 overflow-hidden">
                                                    <pre className="text-xs text-slate-600 font-mono line-clamp-3">
                                                        {tool.code}
                                                    </pre>
                                                  </div>
                                              ) : tool.type === 'rest-api' ? (
                                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                                      <span className={`font-bold px-1.5 py-0.5 rounded ${getMethodBadgeColor(tool.method || 'GET')}`}>
                                                          {tool.method}
                                                      </span>
                                                      <code className="text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={tool.endpoint}>
                                                        {tool.endpoint}
                                                      </code>
                                                  </div>
                                              ) : (
                                                  <div className="mt-2 space-y-2">
                                                      <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-gray-400 uppercase font-semibold text-[10px]">Index</span>
                                                        <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{tool.index}</code>
                                                      </div>
                                                      <div className="flex flex-wrap gap-1">
                                                          {Object.entries(tool.params).filter(([,v])=>v).map(([k]) => (
                                                              <span key={k} className="text-[10px] font-mono bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded">
                                                                  {k}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50/50">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                                            <Icon name="wrench-screwdriver" className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h4 className="text-gray-900 font-medium mb-1">No Tools Configured</h4>
                                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                            Use the builder on the left to add capabilities to your server.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto space-y-8">
                     <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <div className="border-b border-gray-100 pb-4 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">Remote Connection Details</h3>
                            <p className="text-sm text-gray-500">Connect to an existing running MCP server.</p>
                        </div>
                         <div>
                            <label htmlFor="remote-name" className="block text-sm font-medium text-gray-700 mb-2">
                                Server Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="remote-name"
                                type="text"
                                value={remoteName}
                                onChange={(e) => setRemoteName(e.target.value)}
                                className="w-full bg-white text-gray-900 rounded-lg px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition shadow-sm"
                                placeholder="e.g., Remote Production Server"
                                required
                            />
                         </div>

                         <div>
                            <label htmlFor="remote-url" className="block text-sm font-medium text-gray-700 mb-2">
                                Server URL <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <Icon name="link" className="h-5 w-5" />
                                </span>
                                <input
                                    id="remote-url"
                                    type="url"
                                    value={remoteUrl}
                                    onChange={(e) => setRemoteUrl(e.target.value)}
                                    className="w-full bg-white text-gray-900 rounded-lg pl-10 pr-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition shadow-sm"
                                    placeholder="https://api.example.com/mcp"
                                    required
                                />
                            </div>
                         </div>

                         <div>
                            <label htmlFor="remote-token" className="block text-sm font-medium text-gray-700 mb-2">
                                Bearer Token <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                id="remote-token"
                                type="password"
                                value={remoteToken}
                                onChange={(e) => setRemoteToken(e.target.value)}
                                className="w-full bg-white text-gray-900 rounded-lg px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition shadow-sm"
                                placeholder="sk-..."
                            />
                         </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Transport Type
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <label 
                                    className={`relative flex items-start p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                                        remoteTransport === TransportType.SSE 
                                        ? 'border-green-500 bg-green-50/50 shadow-sm ring-1 ring-green-500' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                 >
                                    <div className="flex items-center h-5">
                                        <input
                                            type="radio"
                                            name="transport"
                                            value={TransportType.SSE}
                                            checked={remoteTransport === TransportType.SSE}
                                            onChange={() => setRemoteTransport(TransportType.SSE)}
                                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                                        />
                                    </div>
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-gray-900">SSE (Server-Sent Events)</span>
                                        <span className="block text-xs text-gray-500 mt-1">Standard for real-time updates.</span>
                                    </div>
                                 </label>

                                 <label 
                                    className={`relative flex items-start p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                                        remoteTransport === TransportType.STREAMABLE_HTTP 
                                        ? 'border-green-500 bg-green-50/50 shadow-sm ring-1 ring-green-500' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                 >
                                    <div className="flex items-center h-5">
                                        <input
                                            type="radio"
                                            name="transport"
                                            value={TransportType.STREAMABLE_HTTP}
                                            checked={remoteTransport === TransportType.STREAMABLE_HTTP}
                                            onChange={() => setRemoteTransport(TransportType.STREAMABLE_HTTP)}
                                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                                        />
                                    </div>
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-gray-900">Streamable HTTP</span>
                                        <span className="block text-xs text-gray-500 mt-1">Optimized for high-throughput.</span>
                                    </div>
                                 </label>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white px-8 py-5 border-t border-gray-200 flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
            {activeTab === 'managed' && (
              <>
                <Icon name="cpu-chip" className="w-4 h-4 text-gray-400" />
                <span>SDK Version: <span className="font-semibold text-gray-700">{CURRENT_SDK_VERSION}</span></span>
              </>
            )}
        </div>
        <div className="flex space-x-3">
            <button type="button" onClick={onCancel} className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 rounded-lg transition-colors border border-gray-300 shadow-sm">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg">
              {initialData ? 'Save Configuration' : activeTab === 'managed' ? 'Create Managed Server' : 'Connect Remote Server'}
            </button>
        </div>
      </div>
    </form>
  );
};
