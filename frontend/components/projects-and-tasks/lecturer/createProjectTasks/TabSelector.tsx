// /components/projects-and-tasks/lecturer/createProjectTasks/TabSelector.tsx

'use client';

import React from 'react';
import { FileText, CheckCircle2, Sparkles, CodeXml } from 'lucide-react';
import { motion } from 'framer-motion';

interface TabSelectorProps {
  activeTab: 'project' | 'task' | 'code';
  onTabChange: (tab: 'project' | 'task' | 'code') => void;
}

export default function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  const tabVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    hover: { y: -2, transition: { duration: 0.2 } },
    tap: { scale: 0.98 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex gap-4 items-center justify-between mb-0 pb-0"
    >
      {/* Browser-like Tabs Container */}
      <div className="flex gap-1 bg-gradient-to-r from-gray-50 to-white p-1.5 rounded-t-2xl border-t border-l border-r border-gray-200">
        {/* Project Tab */}
        <motion.button
          variants={tabVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          onClick={() => onTabChange('project')}
          transition={{ duration: 0.3 }}
          className={`relative px-6 py-3 font-semibold flex items-center gap-2.5 rounded-t-xl transition-all group ${
            activeTab === 'project'
              ? 'bg-white text-brand-blue shadow-md shadow-brand-blue/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          {/* Active Tab Background */}
          {activeTab === 'project' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white rounded-t-xl -z-10"
              transition={{ duration: 0.3, type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Icon with rotation animation */}
          <motion.div
            animate={{ rotate: activeTab === 'project' ? 0 : -15 }}
            transition={{ duration: 0.3 }}
            className="group-hover:text-brand-blue transition-colors"
          >
            <FileText size={20} strokeWidth={2.5} />
          </motion.div>

          <span className="font-semibold tracking-tight">Create Project</span>

          {/* Active indicator dot */}
          {activeTab === 'project' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-brand-blue rounded-full ml-1"
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>

        {/* Task Tab */}
        <motion.button
          variants={tabVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          onClick={() => onTabChange('task')}
          transition={{ duration: 0.3, delay: 0.05 }}
          className={`relative px-6 py-3 font-semibold flex items-center gap-2.5 rounded-t-xl transition-all group ${
            activeTab === 'task'
              ? 'bg-white text-brand-blue shadow-md shadow-brand-blue/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          {/* Active Tab Background */}
          {activeTab === 'task' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white rounded-t-xl -z-10"
              transition={{ duration: 0.3, type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Icon with rotation animation */}
          <motion.div
            animate={{ rotate: activeTab === 'task' ? 0 : -15 }}
            transition={{ duration: 0.3 }}
            className="group-hover:text-brand-blue transition-colors"
          >
            <CheckCircle2 size={20} strokeWidth={2.5} />
          </motion.div>

          <span className="font-semibold tracking-tight">Create Task</span>

          {/* Active indicator dot */}
          {activeTab === 'task' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-brand-blue rounded-full ml-1"
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>

        {/* Code Tab */}
        <motion.button
          variants={tabVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          onClick={() => onTabChange('code')}
          transition={{ duration: 0.3, delay: 0.05 }}
          className={`relative px-6 py-3 font-semibold flex items-center gap-2.5 rounded-t-xl transition-all group ${
            activeTab === 'code'
              ? 'bg-white text-brand-blue shadow-md shadow-brand-blue/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          {/* Active Tab Background */}
          {activeTab === 'code' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white rounded-t-xl -z-10"
              transition={{ duration: 0.3, type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Icon with rotation animation */}
          <motion.div
            animate={{ rotate: activeTab === 'code' ? 0 : -15 }}
            transition={{ duration: 0.3 }}
            className="group-hover:text-brand-blue transition-colors"
          >
            <CodeXml size={20} strokeWidth={2.5} />
          </motion.div>

          <span className="font-semibold tracking-tight">Create Code</span>

          {/* Active indicator dot */}
          {activeTab === 'code' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-brand-blue rounded-full ml-1"
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>
      </div>

      {/* Use Template Button with Animation */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.button
          disabled
          whileHover={{ scale: 0.98, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="px-5 py-2.5 bg-gradient-to-r from-brand-blue/10 via-brand-yellow/5 to-brand-blue/10 border border-brand-blue/30 text-gray-600 rounded-lg hover:from-brand-blue/15 hover:to-brand-blue/15 hover:border-brand-blue/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold whitespace-nowrap flex items-center gap-2 group shadow-sm hover:shadow-md"
          title="Coming soon - will allow creating from templates"
        >
          {/* Animated Sparkle Icon */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles size={16} className="text-brand-blue group-hover:text-brand-blue/80 transition-colors" />
          </motion.div>

          <span className="text-sm">Use Template</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}