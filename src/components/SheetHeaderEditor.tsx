import React, { useState } from 'react';
import { Edit2, Eye, EyeOff, Plus, Trash2, Save, X } from 'lucide-react';
import { SheetHeaderConfiguration, SheetColumnHeader } from '../types';

interface SheetHeaderEditorProps {
  sheetType: 'receipts' | 'payments' | 'transfers' | 'accounts' | 'categories';
  config?: SheetHeaderConfiguration;
  defaultHeaders: { fieldKey: string; defaultLabel: string }[];
  onSave: (config: SheetHeaderConfiguration) => void;
}

export const SheetHeaderEditor: React.FC<SheetHeaderEditorProps> = ({
  sheetType,
  config,
  defaultHeaders,
  onSave
}) => {
  const [columns, setColumns] = useState<SheetColumnHeader[]>(
    config?.columns || defaultHeaders.map((h, idx) => ({
      id: `col_${idx}`,
      fieldKey: h.fieldKey,
      customLabel: h.defaultLabel,
      isVisible: true,
      displayOrder: idx
    }))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdateLabel = (id: string, newLabel: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, customLabel: newLabel } : c));
  };

  const handleToggleVisibility = (id: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
  };

  const handleDeleteColumn = (id: string) => {
    setColumns(cols => cols.filter(c => c.id !== id));
  };

  const handleReorderColumns = (fromIdx: number, toIdx: number) => {
    const newColumns = [...columns];
    const [removed] = newColumns.splice(fromIdx, 1);
    newColumns.splice(toIdx, 0, removed);
    
    // Update display order
    newColumns.forEach((col, idx) => {
      col.displayOrder = idx;
    });
    
    setColumns(newColumns);
  };

  const handleSave = () => {
    const newConfig: SheetHeaderConfiguration = {
      id: config?.id || `config_${sheetType}_${Date.now()}`,
      orgId: config?.orgId || '',
      sheetType,
      columns,
      createdAt: config?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(newConfig);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{sheetType} Headers</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
            Edit Headers
          </button>
        </div>

        <div className="space-y-2">
          {columns
            .filter(c => c.isVisible)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(col => (
              <div key={col.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{col.customLabel}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">({col.fieldKey})</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white capitalize">Edit {sheetType} Headers</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {columns
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((col, idx) => (
            <div key={col.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              {/* Visibility Toggle */}
              <button
                onClick={() => handleToggleVisibility(col.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {col.isVisible ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>

              {/* Label Edit */}
              <div className="flex-1">
                {editingId === col.id ? (
                  <input
                    type="text"
                    value={col.customLabel}
                    onChange={(e) => handleUpdateLabel(col.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-slate-600 dark:text-white text-sm"
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(col.id)}
                    className="cursor-pointer p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{col.customLabel}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{col.fieldKey}</p>
                  </div>
                )}
              </div>

              {/* Order Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => idx > 0 && handleReorderColumns(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-300"
                >
                  ↑
                </button>
                <button
                  onClick={() => idx < columns.length - 1 && handleReorderColumns(idx, idx + 1)}
                  disabled={idx === columns.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-slate-300"
                >
                  ↓
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteColumn(col.id)}
                disabled={columns.length === 1}
                className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          Save Headers
        </button>
        <button
          onClick={() => {
            setColumns(
              config?.columns || defaultHeaders.map((h, idx) => ({
                id: `col_${idx}`,
                fieldKey: h.fieldKey,
                customLabel: h.defaultLabel,
                isVisible: true,
                displayOrder: idx
              }))
            );
            setIsEditing(false);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
