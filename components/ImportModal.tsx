'use client';

// ============================================================
// COMPONENTE: MODAL DE IMPORTAÇÃO AVANÇADA (WIZARD)
// ============================================================

import React, { useRef, useState, useCallback } from 'react';
import { 
  Upload, X, FileSpreadsheet, CheckCircle2, Loader2, 
  AlertCircle, ChevronLeft, 
  Database, ArrowRight, Plus, Trash2
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { 
  getExcelPreview, 
  mergeSources, 
  parseExcelFile, 
  ExcelPreview, 
  ColumnMapping 
} from '@/services/importService';
import toast from 'react-hot-toast';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'UPLOAD' | 'MAPPING' | 'FINISH';

interface PendingSource {
  preview: ExcelPreview;
  file: File;
  mapping: ColumnMapping;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('UPLOAD');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<PendingSource[]>([]);
  const { setBase, setImporting } = useAppStore();

  // Resetar ao fechar
  const handleClose = useCallback(() => {
    setStep('UPLOAD');
    setSources([]);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    try {
      const newSources: PendingSource[] = [];
      for (const file of files) {
        const preview = await getExcelPreview(file);
        
        // Auto-mapeamento inicial
        const mapping: ColumnMapping = {
          vin: preview.columns.find(c => ['VIN', 'CHASSI', 'CHASSIS'].includes(c.toUpperCase())) || preview.columns[0],
          placa: preview.columns.find(c => ['PLACA', 'PLACA VEICULO'].includes(c.toUpperCase())),
          modelo: preview.columns.find(c => ['MODELO', 'VEICULO', 'DESCRIÇÃO'].includes(c.toUpperCase())),
          cor: preview.columns.find(c => ['COR'].includes(c.toUpperCase())),
          vaga: preview.columns.find(c => ['VAGA', 'BOX', 'POSICAO'].includes(c.toUpperCase())),
          cliente: preview.columns.find(c => ['CLIENTE', 'DESTINATARIO'].includes(c.toUpperCase())),
        };

        newSources.push({ preview, file, mapping });
      }
      setSources(newSources);
      setStep('MAPPING');
    } catch (err) {
      toast.error('Erro ao processar arquivo(s)');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  type StringMappingKey = 'vin' | 'placa' | 'modelo' | 'cor' | 'vaga' | 'cliente';
  const updateMapping = (sourceIndex: number, field: StringMappingKey, column: string) => {
    const newSources = [...sources];
    newSources[sourceIndex].mapping[field] = column;
    setSources(newSources);
  };

  // ---- Colunas extras ----
  const addExtraColumn = (sourceIndex: number) => {
    const newSources = [...sources];
    const extras = newSources[sourceIndex].mapping.extraColumns || [];
    newSources[sourceIndex].mapping.extraColumns = [...extras, { label: '', column: '' }];
    setSources(newSources);
  };

  const updateExtraColumn = (sourceIndex: number, extraIndex: number, field: 'label' | 'column', value: string) => {
    const newSources = [...sources];
    const extras = [...(newSources[sourceIndex].mapping.extraColumns || [])];
    extras[extraIndex] = { ...extras[extraIndex], [field]: value };
    newSources[sourceIndex].mapping.extraColumns = extras;
    setSources(newSources);
  };

  const removeExtraColumn = (sourceIndex: number, extraIndex: number) => {
    const newSources = [...sources];
    const extras = [...(newSources[sourceIndex].mapping.extraColumns || [])];
    extras.splice(extraIndex, 1);
    newSources[sourceIndex].mapping.extraColumns = extras;
    setSources(newSources);
  };

  const executeImport = async () => {
    setIsLoading(true);
    setImporting(true);
    try {
      const sourcesWithData = await Promise.all(
        sources.map(async (s) => ({
          data: await parseExcelFile(s.file),
          mapping: s.mapping
        }))
      );

      const { base, count } = mergeSources(sourcesWithData);
      setBase(base);
      toast.success(`Base carregada: ${count} VINs identificados`);
      setStep('FINISH');
    } catch (err) {
      toast.error('Falha na importação final');
    } finally {
      setIsLoading(false);
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <Database size={16} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-white tracking-widest uppercase">
                Importação de Base
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`h-1.5 w-8 rounded-full ${step === 'UPLOAD' ? 'bg-blue-500' : 'bg-slate-700'}`} />
                <span className={`h-1.5 w-8 rounded-full ${step === 'MAPPING' ? 'bg-blue-500' : 'bg-slate-700'}`} />
                <span className={`h-1.5 w-8 rounded-full ${step === 'FINISH' ? 'bg-blue-500' : 'bg-slate-700'}`} />
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body - Área de conteúdo com scroll controlado */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
          
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-mono text-white">Carregar fontes de dados</h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Selecione as planilhas da Nissan (VIN/Modelo/Cor) e da Placa separadamente se desejar.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative rounded-2xl border-2 border-dashed border-slate-700 p-12 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-900/30 transition-all">
                    {isLoading ? <Loader2 size={32} className="text-blue-400 animate-spin" /> : <Upload size={32} className="text-slate-500 group-hover:text-blue-400" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-mono text-slate-300 font-bold">Clique para selecionar arquivos</p>
                    <p className="text-xs font-mono text-slate-500">Excel (.xlsx, .xls) ou CSV</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 flex gap-3">
                <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                <p className="text-[11px] font-mono text-amber-200/70 leading-relaxed">
                  DICA: Você pode selecionar vários arquivos ao mesmo tempo. O sistema tentará unir todos usando o VIN como referência.
                </p>
              </div>
            </div>
          )}

          {step === 'MAPPING' && (
            <div className="space-y-8">
              {sources.map((src, sIdx) => (
                <div key={sIdx} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-2 px-2">
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    <span className="text-xs font-mono font-bold text-slate-300 truncate">{src.file.name}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campos a mapear */}
                    <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                      <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest mb-2">Mapeamento de Colunas</p>
                      
                      {(
                        [
                          { id: 'vin' as const, label: 'VIN / CHASSI', required: true },
                          { id: 'placa' as const, label: 'PLACA' },
                          { id: 'modelo' as const, label: 'MODELO' },
                          { id: 'cor' as const, label: 'COR' },
                          { id: 'vaga' as const, label: 'VAGA' },
                        ] as const
                      ).map(field => (
                        <div key={field.id} className="flex flex-col gap-1">
                          <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            {field.label} {'required' in field && field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={(src.mapping[field.id] as string | undefined) || ''}
                            onChange={(e) => updateMapping(sIdx, field.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-blue-500 outline-none appearance-none cursor-pointer h-9"
                          >
                            <option value="">Não importar</option>
                            {src.preview.columns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      {/* ── Colunas Extras Personalizadas ── */}
                      <div className="pt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                            + Colunas Extras
                          </p>
                          <button
                            type="button"
                            onClick={() => addExtraColumn(sIdx)}
                            className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600 rounded-lg px-2 py-1 transition-all"
                          >
                            <Plus size={10} /> Adicionar coluna
                          </button>
                        </div>

                        {(src.mapping.extraColumns || []).length === 0 && (
                          <p className="text-[10px] font-mono text-slate-600 italic">
                            Nenhuma coluna extra. Clique em "Adicionar coluna" para incluir campos personalizados.
                          </p>
                        )}

                        <div className="space-y-2">
                          {(src.mapping.extraColumns || []).map((extra, eIdx) => (
                            <div key={eIdx} className="flex gap-2 items-end">
                              {/* Nome da coluna (label livre) */}
                              <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[9px] font-mono text-slate-500 uppercase">Nome</label>
                                <input
                                  type="text"
                                  value={extra.label}
                                  onChange={(e) => updateExtraColumn(sIdx, eIdx, 'label', e.target.value)}
                                  placeholder="Ex: Nº Pedido"
                                  className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:border-blue-500 outline-none placeholder-slate-600"
                                />
                              </div>

                              {/* Coluna da planilha */}
                              <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[9px] font-mono text-slate-500 uppercase">Coluna</label>
                                <select
                                  value={extra.column}
                                  onChange={(e) => updateExtraColumn(sIdx, eIdx, 'column', e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:border-blue-500 outline-none appearance-none"
                                >
                                  <option value="">Selecionar...</option>
                                  {src.preview.columns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Remover */}
                              <button
                                type="button"
                                onClick={() => removeExtraColumn(sIdx, eIdx)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 border border-slate-700 hover:border-red-800/50 transition-all mb-0.5"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview da planilha */}
                    <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Preview dos Dados</p>
                        <span className="text-[9px] font-mono text-slate-600">Mostrando primeiras 10 linhas</span>
                      </div>
                      
                      <div className="overflow-x-auto overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-800">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-slate-950 z-20">
                            <tr>
                              {src.preview.columns.map(c => {
                                const isMapped = Object.values(src.mapping).some(v => 
                                  Array.isArray(v) ? v.some(extra => extra.column === c) : v === c
                                );
                                return (
                                  <th 
                                    key={c} 
                                    className={`text-[9px] font-mono p-2 border-b border-slate-800 truncate max-w-[120px] uppercase transition-colors ${
                                      isMapped ? 'text-blue-400 bg-blue-900/10' : 'text-slate-600'
                                    }`}
                                  >
                                    {c}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {src.preview.rows.map((r, i) => (
                              <tr key={i} className="border-t border-slate-900/50 hover:bg-slate-900/30 transition-colors">
                                {src.preview.columns.map(c => {
                                  const isMapped = Object.values(src.mapping).some(v => 
                                    Array.isArray(v) ? v.some(extra => extra.column === c) : v === c
                                  );
                                  return (
                                    <td 
                                      key={c} 
                                      className={`text-[9px] font-mono px-2 py-1.5 border-r border-slate-900/30 truncate max-w-[120px] ${
                                        isMapped ? 'text-blue-200 bg-blue-900/5' : 'text-slate-500'
                                      }`}
                                    >
                                      {String(r[c] ?? '')}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-800/30">
                         <p className="text-[9px] font-mono text-slate-500 leading-tight">
                           As colunas <span className="text-blue-400 font-bold">azuladas</span> já estão mapeadas no menu ao lado. Role para o lado para ver mais colunas.
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 'FINISH' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-mono text-white">Importação Completa!</h3>
                <p className="text-sm font-mono text-slate-400">Dados processados e prontos para uso em memória.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                  <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-1">Total VINs</p>
                  <p className="text-2xl font-mono font-bold text-blue-400">
                    {useAppStore.getState().base ? Object.keys(useAppStore.getState().base).length : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                  <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-1">Status Base</p>
                  <p className="text-2xl font-mono font-bold text-emerald-400">ATIVO</p>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between">
          <div>
            {step === 'MAPPING' && (
              <button 
                onClick={() => setStep('UPLOAD')}
                className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
               >
                <ChevronLeft size={14} /> Voltar
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-mono font-bold tracking-widest transition-all"
            >
              {step === 'FINISH' ? 'FECHAR' : 'CANCELAR'}
            </button>
            
            {step === 'MAPPING' && (
              <button 
                onClick={executeImport}
                disabled={isLoading}
                className="group px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-mono font-bold tracking-widest shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>INICIAR IMPORTAÇÃO <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
