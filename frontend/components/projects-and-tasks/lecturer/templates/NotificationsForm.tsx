import React, { useState } from 'react';
import { Bell, Plus, X, GripVertical } from 'lucide-react';
import FormSection from './FormSection';

interface Notification {
  order: number;
  message: string;
  scheduledFor?: Date;
}

interface NotificationsFormProps {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
}

export default function NotificationsForm({
  notifications,
  onNotificationsChange,
}: NotificationsFormProps) {
  const [newMessage, setNewMessage] = useState('');

  const addNotification = () => {
    if (newMessage.trim()) {
      const newNotification: Notification = {
        order: notifications.length + 1,
        message: newMessage.trim(),
      };
      onNotificationsChange([...notifications, newNotification]);
      setNewMessage('');
    }
  };

  const removeNotification = (index: number) => {
    onNotificationsChange(
      notifications.filter((_, i) => i !== index).map((n, i) => ({
        ...n,
        order: i + 1,
      }))
    );
  };

  return (
    <FormSection
      title="Notifications"
      description="Add messages to notify students during the project"
      icon={<Bell size={24} />}
      collapsible
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Add Notification Message
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNotification()}
              placeholder="Enter notification message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
            />
            <button
              onClick={addNotification}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {notifications.map((notif, index) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 hover:border-brand-blue transition-colors"
                >
                  <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Message #{notif.order}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(index)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                    title="Remove notification"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            No notifications added yet
          </div>
        )}
      </div>
    </FormSection>
  );
}
