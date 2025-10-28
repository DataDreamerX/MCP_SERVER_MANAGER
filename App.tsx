import React, { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ServerCard } from './components/ServerCard';
import { Modal } from './components/Modal';
import { ServerForm } from './components/ServerForm';
import { Pagination } from './components/Pagination';
import { StatusFilter } from './components/StatusFilter';
import { ServerConfig, ServerStatus, TransportType } from './types';
import { Icon } from './components/Icon';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';

const initialServers: ServerConfig[] = [
  { id: '1', name: 'Project Chimera', command: 'mcp-agent --run research --max-agents 10', status: ServerStatus.ONLINE, transport: TransportType.SSE, endpoint: '192.168.1.101:8080', agentsRunning: 8, maxAgents: 10, createdBy: 'admin@mcp.com', lastModified: '2023-10-27T10:00:00Z', isPublic: true },
  { id: '2', name: 'Odyssey Bot Fleet', command: 'mcp-agent-support --port 9000 --limit 50', status: ServerStatus.OFFLINE, transport: TransportType.STREAMABLE_HTTP, endpoint: 'api.odyssey.com/v1', agentsRunning: 0, maxAgents: 50, createdBy: 'dev@odyssey.ai', lastModified: '2023-10-26T14:30:00Z', isPublic: false },
  { id: '3', name: 'Code Weaver', command: 'node /srv/codeweaver/index.js --mode gpt4', status: ServerStatus.STARTING, transport: TransportType.SSE, endpoint: '10.0.0.5:3000', agentsRunning: 0, maxAgents: 25, sourceFiles: [{ path: 'index.js', content: 'console.log("Hello, MCP!");' }], createdBy: 'sre@internal.net', lastModified: '2023-10-27T11:20:00Z', isPublic: false },
  { id: '4', name: 'DataCrunch Alpha', command: 'python main.py --dataset=large', status: ServerStatus.ONLINE, transport: TransportType.STREAMABLE_HTTP, endpoint: 'jobs.datacrunch.io', agentsRunning: 18, maxAgents: 20, createdBy: 'data-team@crunch.co', lastModified: '2023-10-25T09:00:00Z', isPublic: true },
  { id: '5', name: 'Automaton Prime', command: './automaton --config prod.yml', status: ServerStatus.OFFLINE, transport: TransportType.SSE, endpoint: '172.16.0.10:9999', agentsRunning: 0, maxAgents: 100, createdBy: 'admin@mcp.com', lastModified: '2023-10-24T18:45:00Z', isPublic: false },
  { id: '6', name: 'Research Hub Gamma', command: 'mcp-agent --run research --gpu-enabled', status: ServerStatus.OFFLINE, transport: TransportType.STREAMABLE_HTTP, endpoint: '192.168.1.102:8080', agentsRunning: 0, maxAgents: 15, createdBy: 'research@mcp.com', lastModified: '2023-10-27T12:00:00Z', isPublic: false },
  { id: '7', name: 'Support Sphere', command: 'mcp-agent-support --port 9001', status: ServerStatus.ONLINE, transport: TransportType.SSE, endpoint: 'api.odyssey.com/v2', agentsRunning: 45, maxAgents: 50, createdBy: 'dev@odyssey.ai', lastModified: '2023-10-27T08:15:00Z', isPublic: false },
];

const ITEMS_PER_PAGE = 6;

type StatusFilterType = 'All' | ServerStatus;
type ModalContent = 'form' | 'delete' | null;

const App: React.FC = () => {
  const [servers, setServers] = useState<ServerConfig[]>(initialServers);
  const [modalContent, setModalContent] = useState<ModalContent>(null);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [serverToDelete, setServerToDelete] = useState<ServerConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('All');

  const handleOpenCreateModal = useCallback(() => {
    setEditingServer(null);
    setModalContent('form');
  }, []);

  const handleOpenEditModal = useCallback((server: ServerConfig) => {
    setEditingServer(server);
    setModalContent('form');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalContent(null);
    setEditingServer(null);
    setServerToDelete(null);
  }, []);

  const handleSaveServer = useCallback((serverData: Omit<ServerConfig, 'id' | 'status' | 'agentsRunning' | 'createdBy' | 'lastModified'>) => {
    const currentUser = 'user@example.com'; // In a real app, this would come from an auth context
    const now = new Date().toISOString();
    
    if (editingServer) {
      // Update existing server
      setServers(prev => prev.map(s => s.id === editingServer.id ? { ...s, ...serverData, lastModified: now } : s));
    } else {
      // Create new server
      const newServer: ServerConfig = {
        ...serverData,
        id: new Date().toISOString(),
        status: ServerStatus.OFFLINE,
        agentsRunning: 0,
        createdBy: currentUser,
        lastModified: now,
      };
      setServers(prev => [newServer, ...prev]);
    }
    handleCloseModal();
  }, [editingServer, handleCloseModal]);
  
  const handleInitiateDelete = useCallback((server: ServerConfig) => {
    const skipUntil = localStorage.getItem('skipDeleteConfirmUntil');
    const now = new Date().getTime();

    if (skipUntil && now < Number(skipUntil)) {
      setServers(prev => prev.filter(s => s.id !== server.id));
    } else {
      setServerToDelete(server);
      setModalContent('delete');
    }
  }, []);

  const handleConfirmDelete = useCallback((skipToday: boolean) => {
    if (serverToDelete) {
      setServers(prev => prev.filter(s => s.id !== serverToDelete.id));
      if (skipToday) {
        const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem('skipDeleteConfirmUntil', expiry.toString());
      }
      handleCloseModal();
    }
  }, [serverToDelete, handleCloseModal]);

  const toggleServerStatus = useCallback((id: string, currentStatus: ServerStatus) => {
    const isOnline = currentStatus === ServerStatus.ONLINE;
    const transitionStatus = isOnline ? ServerStatus.STOPPING : ServerStatus.STARTING;
    const finalStatus = isOnline ? ServerStatus.OFFLINE : ServerStatus.ONLINE;

    setServers(prev => prev.map(s => s.id === id ? { ...s, status: transitionStatus, lastModified: new Date().toISOString() } : s));

    setTimeout(() => {
       setServers(prev => prev.map(s => s.id === id ? { ...s, status: finalStatus, agentsRunning: finalStatus === ServerStatus.ONLINE ? Math.floor(Math.random() * s.maxAgents) : 0 } : s));
    }, 2000);
  }, []);

  const toggleServerVisibility = useCallback((id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, isPublic: !s.isPublic, lastModified: new Date().toISOString() } : s));
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };
  
  const handleStatusFilterChange = useCallback((filter: StatusFilterType) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  }, []);

  const serverCounts = useMemo(() => {
    const counts: { [key: string]: number } = { All: servers.length };
    for (const status of Object.values(ServerStatus)) {
        counts[status] = servers.filter(s => s.status === status).length;
    }
    return counts;
  }, [servers]);

  const filteredServers = useMemo(() => {
    let tempServers = servers;

    if (statusFilter !== 'All') {
      tempServers = tempServers.filter(server => server.status === statusFilter);
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    if (!lowercasedQuery) return tempServers;

    return tempServers.filter(server =>
      server.name.toLowerCase().includes(lowercasedQuery) ||
      server.command.toLowerCase().includes(lowercasedQuery) ||
      server.endpoint.toLowerCase().includes(lowercasedQuery) ||
      server.transport.toLowerCase().includes(lowercasedQuery) ||
      server.createdBy.toLowerCase().includes(lowercasedQuery) ||
      server.sourceFiles?.some(file => file.path.toLowerCase().includes(lowercasedQuery)) ||
      (server.isPublic && 'public'.includes(lowercasedQuery)) ||
      (!server.isPublic && 'private'.includes(lowercasedQuery))
    );
  }, [servers, searchQuery, statusFilter]);

  const paginatedServers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredServers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredServers, currentPage]);

  const totalPages = Math.ceil(filteredServers.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">
      <div className="container mx-auto px-4 py-8 flex flex-col flex-grow">
        <Header 
          oncreateServer={handleOpenCreateModal}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
        
        <main className="mt-8 flex flex-col flex-grow">
          {servers.length > 0 && (
            <StatusFilter
              currentFilter={statusFilter}
              onFilterChange={handleStatusFilterChange}
              serverCounts={serverCounts}
            />
          )}

          <div>
            {servers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg flex flex-col justify-center items-center shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-600">No Agent Servers Found</h2>
                <p className="text-gray-500 mt-2">Get started by creating your first agent server.</p>
                <button onClick={handleOpenCreateModal} className="mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                  Create Your First Server
                </button>
              </div>
            ) : paginatedServers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg flex flex-col justify-center items-center shadow-sm">
                <Icon name="search" className="w-12 h-12 mx-auto text-gray-400" />
                <h2 className="text-2xl font-semibold text-gray-600 mt-4">No Servers Found</h2>
                <p className="text-gray-500 mt-2">Your search and filter criteria did not match any servers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedServers.map(server => (
                  <ServerCard 
                    key={server.id} 
                    server={server}
                    onToggleStatus={() => toggleServerStatus(server.id, server.status)}
                    onEdit={() => handleOpenEditModal(server)}
                    onDelete={() => handleInitiateDelete(server)}
                    onToggleVisibility={() => toggleServerVisibility(server.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-auto">
            {totalPages > 1 && paginatedServers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </main>
      </div>

      <Modal isOpen={!!modalContent} onClose={handleCloseModal}>
        {modalContent === 'form' && (
          <ServerForm 
            initialData={editingServer}
            onSave={handleSaveServer}
            onCancel={handleCloseModal}
          />
        )}
        {modalContent === 'delete' && (
          <DeleteConfirmationModal
            server={serverToDelete}
            onConfirm={handleConfirmDelete}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </div>
  );
};

export default App;
