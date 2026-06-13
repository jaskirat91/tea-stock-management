import React from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Modal } from '../../components/Modal';
import { Save, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { KbdBadge } from '../../components/KbdBadge';

interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}

interface QuickCreateMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newItem: any) => void;
  entityName: string;
  title: string;
  fields: Field[];
}

export const QuickCreateMasterModal: React.FC<QuickCreateMasterModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  entityName, 
  title, 
  fields 
}) => {
  const { invoke, loading } = useIpc();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (formData: any) => {
    try {
      const result = await invoke(`${entityName}:save`, { ...formData, is_active: true });
      reset({});
      onSuccess(result);
    } catch (err) {
      if (err?.toString()?.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed')) {
        alert(`A ${title.toLowerCase()} with the same name already exists!`);
      } else {
        alert('Failed to save: ' + err);
      }
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Quick Add ${title}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}>
        <div className="grid grid-cols-1 gap-4">
          {fields.filter(f => f.name !== 'is_active').map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                {...register(field.name, { required: field.required })}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border ${errors[field.name] ? 'border-red-500' : 'border-black/10 dark:border-white/10'} rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm`}
                autoFocus={fields.indexOf(field) === 0}
              />
              {errors[field.name] && (
                <span className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> This field is required
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
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
            <span>Create & Select</span>
            <KbdBadge keys="Enter" className="bg-black/20 border-black/10 text-xs" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
