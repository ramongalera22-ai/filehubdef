import React from 'react';
import { X, Sparkles, FileText } from 'lucide-react';

interface FilePreviewModalProps {
  file: File;
  onClose: () => void;
  onProcess: () => void;
  isProcessing: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onProcess, isProcessing }) => {
  const isImage = file.type.startsWith('image/');

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg">Vista previa</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 flex flex-col items-center">
            {isImage ? (
              <img src={URL.createObjectURL(file)} alt={file.name} className="max-h-48 rounded-lg object-contain" />
            ) : (
              <FileText size={48} className="text-slate-400" />
            )}
            <p className="text-sm font-bold mt-3">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={onProcess} disabled={isProcessing}
            className="flex-1 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <Sparkles size={16} />
            {isProcessing ? 'Procesando...' : 'Analizar con IA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
