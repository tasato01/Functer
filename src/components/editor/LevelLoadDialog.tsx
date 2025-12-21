
import React, { useEffect, useState } from 'react';
import type { LevelConfig } from '../../types/Level';
import { LevelManager } from '../../utils/LevelManager';
import { audioService } from '../../services/AudioService';
import { Trash2, Download } from 'lucide-react';

interface LevelLoadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (level: LevelConfig) => void;
}

export const LevelLoadDialog: React.FC<LevelLoadDialogProps> = ({ isOpen, onClose, onLoad }) => {
    const [levels, setLevels] = useState<LevelConfig[]>([]);

    const refresh = () => {
        const loaded = LevelManager.loadAllFromLocalStorage();
        console.log('Dialog Refresh, Levels:', loaded); // DEBUG
        setLevels(loaded);
    };

    useEffect(() => {
        if (isOpen) refresh();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this level?")) {
            LevelManager.deleteFromLocalStorage(id);
            refresh();
        }
    };

    const handleExport = (level: LevelConfig, e: React.MouseEvent) => {
        e.stopPropagation();
        LevelManager.exportToJSON(level);
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Saved Levels</h2>

                {levels.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No saved levels found.</div>
                ) : (
                    <div className="space-y-2">
                        {levels.map(l => (
                            <div key={l.id}
                                className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 cursor-pointer group"
                                onClick={() => { audioService.playSE('save'); onLoad(l); }}
                            >
                                <div>
                                    <div className="font-bold text-neon-blue">{l.name}</div>
                                    <div className="text-xs text-gray-400">ID: {l.id} | Diff: {l.difficulty}</div>
                                    {l.description && <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{l.description}</div>}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleExport(l, e)} className="p-2 text-gray-400 hover:text-green-400" title="Download JSON">
                                        <Download size={16} />
                                    </button>
                                    <button onClick={(e) => handleDelete(l.id, e)} className="p-2 text-gray-400 hover:text-red-500" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Close</button>
                </div>
            </div>
        </div>
    );
};
