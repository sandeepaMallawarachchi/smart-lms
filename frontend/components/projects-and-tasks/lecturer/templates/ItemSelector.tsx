// /components/projects-and-tasks/lecturer/templates/ItemSelector.tsx

import React, { useState } from 'react';
import { Check, Package } from 'lucide-react';

interface TemplateItem {
  id: string;
  label: string;
  description: string;
  category: string;
  required?: boolean;
}

interface ItemSelectorProps {
  items: TemplateItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  title?: string;
}

export default function ItemSelector({
  items,
  selectedItems,
  onSelectionChange,
  title = 'Select Items to Include',
}: ItemSelectorProps) {
  const categories = Array.from(new Set(items.map((item) => item.category)));

  const handleToggle = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item?.required) return;

    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter((id) => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Package size={20} className="text-brand-blue" />
        {title}
      </h3>

      <div className="space-y-6">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          return (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 text-brand-blue">
                {category}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryItems.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const isDisabled = item.required;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      disabled={isDisabled}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-brand-blue bg-blue-50'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-gray-200 hover:border-brand-blue hover:bg-gray-50'
                      } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-brand-blue border-brand-blue'
                              : isDisabled
                              ? 'bg-gray-200 border-gray-300'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <Check size={16} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.label}
                            {item.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-brand-blue">
            {selectedItems.length}
          </span>{' '}
          items selected
        </p>
      </div>
    </div>
  );
}