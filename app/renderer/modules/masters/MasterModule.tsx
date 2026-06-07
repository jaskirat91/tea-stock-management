import React, { useState, useEffect, useMemo } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useHotkeys } from '../../hooks/useHotkeys';
import { Modal } from '../../components/Modal';
import { Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { KbdBadge } from '../../components/KbdBadge';
import { useConfirmationStore } from '../../store/confirmationStore';

interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}

interface MasterModuleProps {
  entityName: string; // e.g., 'firm', 'garden'
  title: string;
  fields: Field[];
  columns: string[]; // which fields to show in the list
}

const MasterModule: React.FC<MasterModuleProps> = ({ entityName, title, fields, columns }) => {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { invoke, loading } = useIpc();
  const { openConfirmation } = useConfirmationStore();
  
  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchData = async () => {
    try {
      const result = await invoke(`${entityName}:get-all`);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [entityName]);

  useHotkeys({
    'Cmd+N': () => handleAdd(),
    'Cmd+F': () => document.getElementById('master-search')?.focus(),
    'Esc': () => setIsModalOpen(false),
  });

  const handleAdd = () => {
    setEditingId(null);
    reset();
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    reset(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    openConfirmation({
      // title: 'Delete Confirmation',
      message: `Are you sure you want to delete this ${title.toLowerCase()} entry?`,
      onConfirm: async () => {
        try {
          await invoke(`${entityName}:delete`, id);
          fetchData();
        } catch (err) {
          alert('Failed to delete: ' + err);
        }
      }
    });
  };

  const onSubmit = async (formData: any) => {
    try {
      await invoke(`${entityName}:save`, { ...formData, id: editingId });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save: ' + err);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            id="master-search"
            type="text"
            placeholder={`Search ${title}...`}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <KbdBadge keys="⌘F" className="absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          <span>Add New</span>
          <KbdBadge keys="⌘N" className="bg-black/20 border-black/10" />
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                {columns.map(col => (
                  <th key={col} className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {col.replace('_', ' ')}
                  </th>
                ))}
                <th className="px-6 py-4 text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                    {columns.map(col => (
                      <td key={col} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {typeof item[col] === 'boolean' ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item[col] ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {item[col] ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          item[col] || '-'
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-md hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                    {loading ? 'Loading...' : `No ${title.toLowerCase()} found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? `Edit ${title}` : `New ${title}`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'boolean' ? (
                  <select
                    {...register(field.name)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    {...register(field.name, { required: field.required })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    autoFocus={fields.indexOf(field) === 0}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{editingId ? 'Update' : 'Save'}</span>
              <KbdBadge keys="Enter" className="bg-black/20 border-black/10 text-xs" />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterModule;
