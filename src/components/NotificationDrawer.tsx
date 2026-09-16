import React from 'react';
import { X, Bell, ShieldAlert, Clock, CheckCircle2, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Notification } from '../types';
import { getStore, saveStore } from '../lib/storage';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNavigate: (view: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigate
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    const store = getStore();
    store.notifications.forEach(n => (n.isRead = true));
    saveStore(store);
  };

  const handleClearAll = () => {
    const store = getStore();
    store.notifications = [];
    saveStore(store);
  };

  const iconMap = {
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    alert: <ShieldAlert className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 space-y-4 animate-in slide-in-from-right">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center justify-between text-xs">
            <button onClick={handleMarkAllRead} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Mark all read
            </button>
            <button onClick={handleClearAll} className="text-slate-400 hover:text-rose-500 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No notifications at this time.</span>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.linkView) onNavigate(n.linkView);
                  onClose();
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                    : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">{iconMap[n.type]}</div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {n.message}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
