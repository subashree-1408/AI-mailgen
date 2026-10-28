import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client.js';
import { Contact } from '../../types/index.js';
import { User, Mail } from 'lucide-react';

interface ContactAutocompleteProps {
  value: string;
  onChange: (email: string, name?: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const ContactAutocomplete: React.FC<ContactAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'recipient@company.com',
  required = false,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load contacts initially
    api.getContacts().then((res) => {
      if (res?.contacts) {
        setContacts(res.contacts);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!value || value.includes('@') && value.length > 5 && !isOpen) {
      setFiltered([]);
      return;
    }
    const search = value.toLowerCase();
    const matches = contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(search) ||
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.company && c.company.toLowerCase().includes(search))
    );
    setFiltered(matches);
  }, [value, contacts, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          type="email"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto py-1">
          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Saved Contacts
          </div>
          {filtered.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => {
                onChange(contact.email, contact.name || undefined);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 text-xs flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-semibold">
                  <User className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{contact.name || contact.email}</p>
                  {contact.name && (
                    <p className="text-[11px] text-slate-500">{contact.email}</p>
                  )}
                </div>
              </div>
              {contact.company && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {contact.company}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
