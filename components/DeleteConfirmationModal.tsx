import React, { useState, useEffect } from 'react';
import { ServerConfig } from '../types';
import { Icon } from './Icon';

interface DeleteConfirmationModalProps {
  server: ServerConfig | null;
  onConfirm: (skip: boolean) => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ server, onConfirm, onCancel }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [skipToday, setSkipToday] = useState(false);

    useEffect(() => {
        // Reset input when modal opens for a new server
        setConfirmationText('');
        setSkipToday(false);
    }, [server]);

    if (!server) return null;

    const isMatch = confirmationText === server.name;

    const handleConfirm = () => {
        onConfirm(skipToday);
    };

    return (
        <div>
            <div className="p-6">
                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <Icon name="trash" className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">Delete Server</h2>
                        <p className="text-sm text-gray-500 mt-1">This action is permanent and cannot be undone.</p>
                    </div>
                </div>
                
                <p className="my-6 text-gray-600">
                    To confirm, please type <strong className="text-red-600 font-semibold">{server.name}</strong> in the box below.
                </p>

                <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full bg-gray-50 text-gray-900 rounded-md px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    autoComplete="off"
                    autoFocus
                />
                
                <div className="mt-4">
                    <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={skipToday}
                            onChange={(e) => setSkipToday(e.target.checked)}
                            className="h-4 w-4 rounded bg-gray-100 border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span>Don't ask again for today</span>
                    </label>
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                <button type="button" onClick={onCancel} className="bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors border border-gray-300">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!isMatch}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                >
                    Delete Server
                </button>
            </div>
        </div>
    );
};