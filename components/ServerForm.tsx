import React, { useState, useEffect } from 'react';
import { ServerConfig, TransportType, Tool, ToolArg } from '../types';
import { Icon } from './Icon';

interface ServerFormProps {
  initialData: ServerConfig | null;
  onSave: (data: Omit<ServerConfig, 'id' | 'status' | 'agentsRunning' | 'createdBy' | 'lastModified'>) => void;
  onCancel: () => void;
}

type ToolTypeOption = 'azure' | 'neo4j';

interface FormTool {
  id: number;
  name: string;
  type: ToolTypeOption;
  index: string;
  description: string;
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
  const [name, setName] = useState('');
  const [tools, setTools] = useState<FormTool[]>([]);
  
  // State for the new tool entry form
  const [newToolName, setNewToolName] = useState('');
  const [newToolType, setNewToolType] = useState<ToolTypeOption>('azure');
  const [newToolIndex, setNewToolIndex] = useState('');
  const [newToolDescription, setNewToolDescription] = useState('');
  const [newToolParams, setNewToolParams] = useState(defaultParams);
  const [toolIdCounter, setToolIdCounter] = useState(0);
  const [toolNameError, setToolNameError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
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
            index: cmdTool.index,
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
        }).filter(t => t.index);
      }

      setTools(parsedTools);
      setToolIdCounter(parsedTools.length);
    } else {
      setName('');
      setTools([]);
      setToolIdCounter(0);
    }
  }, [initialData]);

  useEffect(() => {
    if (newToolName.trim() && !/^[a-zA-Z0-9_]+$/.test(newToolName.trim())) {
      setToolNameError('Name can only contain letters, numbers, and underscores.');
    } else if (newToolName.trim() && tools.some(tool => tool.name.trim().toLowerCase() === newToolName.trim().toLowerCase())) {
      setToolNameError('A tool with this name already exists.');
    } else {
      setToolNameError(null);
    }
  }, [newToolName, tools]);

  const isAddToolDisabled = !newToolName.trim() || !newToolIndex.trim() || !!toolNameError;

  const handleAddTool = () => {
    if (isAddToolDisabled) return;
    
    setTools(prev => [...prev, {
      id: toolIdCounter,
      name: newToolName.trim(),
      type: newToolType,
      index: newToolIndex.trim(),
      description: newToolDescription.trim(),
      params: newToolParams,
    }]);
    setToolIdCounter(prev => prev + 1);

    setNewToolName('');
    setNewToolType('azure');
    setNewToolIndex('');
    setNewToolDescription('');
    setNewToolParams(defaultParams);
  };

  const handleRemoveTool = (idToRemove: number) => {
    setTools(prev => prev.filter(tool => tool.id !== idToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    const serverData = {
        name,
        command,
        tools: serverTools,
        transport: initialData?.transport || TransportType.SSE,
        endpoint: initialData?.endpoint || `api.${name.toLowerCase().replace(/\s+/g, '-')}.mcp.com`,
        maxAgents: initialData?.maxAgents || 10,
        sourceFiles: initialData?.sourceFiles || [],
        isPublic: initialData?.isPublic || false,
        sdkVersion: CURRENT_SDK_VERSION,
    };

    console.log('Server Data:', serverData);
    onSave(serverData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{initialData ? 'Edit Server' : 'Create MCP Server'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <Icon name="x-mark" className="w-6 h-6" />
          </button>
        </div>
        
        <div>
          <label htmlFor="server-name" className="block text-sm font-medium text-gray-700 mb-1">
            Server Name <span className="text-red-500">*</span>
          </label>
          <input
            id="server-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            placeholder="e.g., Synapse Grid"
            required
          />
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
                {/* Left Column: Form to add a tool */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Add Tools</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure and add tools for your server to use. At least one tool is required.
                        </p>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                              <label htmlFor="tool-type" className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                              <select id="tool-type" value={newToolType} onChange={e => setNewToolType(e.target.value as ToolTypeOption)} className="w-full bg-white text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition">
                                  <option value="azure">Azure AI Search</option>
                                  <option value="neo4j">Neo4j</option>
                              </select>
                          </div>
                          <div>
                              <label htmlFor="index-name" className="block text-sm font-medium text-gray-700 mb-1">Index Name</label>
                              <input id="index-name" type="text" value={newToolIndex} onChange={e => setNewToolIndex(e.target.value)} placeholder="e.g., product-catalog" className="w-full bg-white text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"/>
                          </div>
                        </div>

                        <div className="space-y-4">
                           <div>
                              <label htmlFor="tool-name" className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
                              <input
                                id="tool-name"
                                type="text"
                                value={newToolName}
                                onChange={e => setNewToolName(e.target.value)}
                                placeholder="e.g., product_retriever"
                                className="w-full bg-white text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                                aria-invalid={!!toolNameError}
                                aria-describedby={toolNameError ? 'tool-name-error' : undefined}
                              />
                              {toolNameError && <p id="tool-name-error" className="text-red-500 text-xs mt-1">{toolNameError}</p>}
                          </div>
                          <div>
                            <label htmlFor="tool-description" className="block text-sm font-medium text-gray-700 mb-1">Tool Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <textarea
                                id="tool-description"
                                rows={3}
                                value={newToolDescription}
                                onChange={e => setNewToolDescription(e.target.value)}
                                placeholder="e.g., Retrieves product information from the catalog."
                                className="w-full bg-white text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                            />
                          </div>
                        </div>

                         <fieldset>
                            <legend className="block text-sm font-medium text-gray-700 mb-2">Parameters</legend>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-not-allowed">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled={true}
                                        className="h-4 w-4 rounded bg-gray-200 border-gray-300 text-green-600 focus:ring-0"
                                    />
                                    <span className="font-mono">query</span>
                                </label>
                                {(['skip', 'top', 'facet', 'filter'] as const).map(param => (
                                    <label key={param} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newToolParams[param]}
                                            onChange={(e) => setNewToolParams(p => ({ ...p, [param]: e.target.checked }))}
                                            className="h-4 w-4 rounded bg-white border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="font-mono">{param}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <div className="flex justify-end pt-2">
                             <button 
                              type="button"
                              onClick={handleAddTool}
                              disabled={isAddToolDisabled}
                              className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <Icon name="plus" className="w-5 h-5" />
                                <span>Add Tool</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: List of added tools */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Server Tools
                        </h3>
                         <span className="text-sm font-medium bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                            {tools.length}
                        </span>
                    </div>

                    {tools.length > 0 ? (
                      <div className="flex-grow space-y-4 max-h-[420px] overflow-y-auto pr-2">
                        {tools.map(tool => (
                          <div key={tool.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                  <div className="flex items-center gap-x-3">
                                      <Icon name="wrench-screwdriver" className="w-5 h-5 text-gray-400" />
                                      <p className="font-semibold text-gray-900 break-words">{tool.name}</p>
                                  </div>
                                  <button type="button" onClick={() => handleRemoveTool(tool.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                      <Icon name="trash" className="w-5 h-5" />
                                  </button>
                              </div>
                              <div className="p-3 text-sm space-y-3">
                                  {tool.description && <p className="text-gray-600">{tool.description}</p>}
                                  <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 items-baseline">
                                      <span className="font-medium text-gray-500">Service</span>
                                      <span className="font-medium text-gray-800">{tool.type === 'azure' ? 'Azure AI Search' : 'Neo4j'}</span>
                                      
                                      <span className="font-medium text-gray-500">Index</span>
                                      <code className="text-xs font-mono bg-gray-100 text-gray-800 px-1.5 py-1 rounded-md break-all">{tool.index}</code>
                                  </div>
                                  <div className="pt-3 border-t border-gray-100">
                                      <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Parameters</h5>
                                      <div className="flex flex-wrap gap-2">
                                          <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded-full">query</span>
                                          {Object.entries(tool.params).filter(([,v])=>v).map(([k]) => <span key={k} className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{k}</span>)}
                                      </div>
                                  </div>
                              </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                        <div className="text-center py-10 px-4 flex flex-col justify-center items-center border-2 border-gray-200 border-dashed rounded-lg flex-grow">
                            <Icon name="wrench-screwdriver" className="w-10 h-10 mx-auto text-gray-400" />
                            <p className="mt-3 text-sm font-medium text-gray-600">No tools have been added yet.</p>
                            <p className="text-xs text-gray-500">Use the form on the left to add a tool.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-8 py-4 flex justify-between items-center border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Icon name="cpu-chip" className="w-4 h-4" />
            <span>SDK Version: <span className="font-semibold text-gray-700">{CURRENT_SDK_VERSION}</span></span>
        </div>
        <div className="flex space-x-3">
            <button type="button" onClick={onCancel} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors border border-gray-300">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              {initialData ? 'Save Changes' : 'Add Server'}
            </button>
        </div>
      </div>
    </form>
  );
};