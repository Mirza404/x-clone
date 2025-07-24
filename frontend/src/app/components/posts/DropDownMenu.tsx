'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';

interface DropdownProps {
  type: 'post' | 'comment';
  onDelete: () => void;
  onEdit: () => void;
  onClose: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  type,
  onDelete,
  onEdit,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const labelSuffix = type === 'post' ? 'post' : 'comment';

  const menuItems = [
    {
      icon: Pencil,
      label: `Edit ${labelSuffix}`,
      onClick: onEdit,
    },
    {
      icon: Trash2,
      label: `Delete ${labelSuffix}`,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-[280px] bg-black border border-gray-800 rounded-xl shadow-lg overflow-hidden"
      style={{ zIndex: 1000 }}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            item.onClick();
          }}
          className={`flex items-center w-full px-4 py-3 text-left hover:bg-gray-900 transition-colors
            ${item.danger ? 'text-red-500' : 'text-white'}
            ${
              index !== menuItems.length - 1 ? 'border-b border-gray-800' : ''
            }`}
        >
          <item.icon className="w-5 h-5 mr-3" />
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Dropdown;
