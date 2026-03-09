'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubmissionNotif {
  _id: string;
  submissionId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export default function SubmissionNotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SubmissionNotif[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions/notifications', { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setNotifications(json.data?.notifications ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.isRead).length;

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      await fetch('/api/submissions/notifications', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ notificationId: id }),
      });
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch('/api/submissions/notifications', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch { /* ignore */ }
  };

  const handleClick = (n: SubmissionNotif) => {
    markRead(n._id);
    setOpen(false);
    router.push(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Submission notifications"
      >
        <Bell size={22} className="text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
          ) : (
            notifications.map(n => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !n.isRead ? 'bg-purple-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-purple-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ExternalLink size={10} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
