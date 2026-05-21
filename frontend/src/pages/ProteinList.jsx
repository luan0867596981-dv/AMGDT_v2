// Updated: 2026-05-19 - Fix protein names (real UniProt IDs), add UniProt ID column,
//                       add action button, expand modal with 3 tabs (Info, Links, Structure)

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, ExternalLink, Microscope } from 'lucide-react';

export default function ProteinList() {
  const [dataset, setDataset] = useState('C');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProtein, setSelectedProtein] = useState(null);
  const [modalTab, setModalTab] = useState('info');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/proteins?dataset=${dataset}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(d => { setData(d.data || []); setTotal(d.total || 0); setLoading(false); })
        .catch(e => { console.error(e); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [dataset, page, limit, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Helper: check if name is in the old Protein_X format (not real)
  const isPlaceholderName = (name) => /^(Protein_\d+|P\d{4})$/.test(name);

  const openModal = (protein) => {
    setSelectedProtein(protein);
    setModalTab('info');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans p-8 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            Danh sách Protein
            <span className="text-sm px-3 py-1 bg-violet-100 text-violet-700 rounded-full font-bold">{total}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Protein được định danh bằng UniProt Accession Number
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase">Dataset:</span>
          <select value={dataset} onChange={e=>{setDataset(e.target.value);setPage(1);}} className="bg-white dark:bg-slate-900 border dark:border-slate-800 px-4 py-2 rounded-xl font-bold text-violet-600 outline-none shadow-sm">
            <option value="all">All Datasets</option>
            <option value="C">C-dataset (993 proteins)</option>
            <option value="B">B-dataset (1021 proteins)</option>
            <option value="F">F-dataset (2741 proteins)</option>
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm protein (UniProt ID)..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-violet-500/50" />
        </div>
        <div className="text-xs text-slate-400 font-bold">
          Ví dụ: P22303, P06276, Q9BXW4
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-400 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-black">STT</th>
                <th className="px-6 py-4 font-black">UniProt ID (Tên Protein)</th>
                <th className="px-6 py-4 font-black">Dataset</th>
                <th className="px-6 py-4 font-black text-center">Thuốc liên quan</th>
                <th className="px-6 py-4 font-black text-center">Bệnh liên quan</th>
                <th className="px-6 py-4 font-black text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data || []).map((row, i) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{(page-1)*limit + i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openModal(row)} className="font-black text-violet-600 hover:text-violet-500 hover:underline font-mono">
                        {row.name}
                      </button>
                      {/* FIXED: Show badge only if placeholder name */}
                      {isPlaceholderName(row.name) && (
                        <span className="text-[8px] font-black bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full uppercase">Chưa có tên</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-black rounded-full">{row.dataset}-dataset</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-teal-600">{row.related_drugs}</td>
                  <td className="px-6 py-4 text-center font-bold text-rose-600">{row.related_diseases}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openModal(row)}
                      title="Xem chi tiết"
                      className="p-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 transition-all"
                    >
                      <Microscope size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Không tìm thấy protein nào.</td></tr>}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="p-4 border-t dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
          <div className="text-xs font-bold text-slate-500">
            Hiển thị {total === 0 ? 0 : (page-1)*limit + 1}–{Math.min(page*limit, total)} trong {total}
          </div>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={e=>{setLimit(parseInt(e.target.value));setPage(1);}} className="mr-4 bg-white dark:bg-slate-900 border dark:border-slate-700 px-2 py-1 rounded-lg text-xs font-bold outline-none">
              <option value="10">10 dòng</option><option value="20">20 dòng</option><option value="50">50 dòng</option>
            </select>
            <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={page===1} className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm disabled:opacity-50"><ChevronLeft size={16}/></button>
            <span className="text-xs font-black px-2">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm disabled:opacity-50"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* Modal Detail - 3 tabs */}
      {selectedProtein && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-start flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-[8px] font-black bg-violet-100 text-violet-700 rounded-full uppercase">Protein</span>
                  <span className="px-2 py-1 text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full uppercase">{selectedProtein.dataset}-dataset</span>
                </div>
                <h3 className="text-2xl font-black font-mono">{selectedProtein.name}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Internal ID: {selectedProtein.id}</p>
              </div>
              <button onClick={()=>setSelectedProtein(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-red-500 flex-shrink-0"><X size={16}/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-slate-800 flex-shrink-0">
              {[
                { id: 'info', label: '📋 Thông tin' },
                { id: 'links', label: '🔗 Liên kết' },
                { id: 'structure', label: '🧬 Cấu trúc' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                    modalTab === tab.id
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto flex-1 p-6">

              {/* Tab 1: Thông tin */}
              {modalTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">UniProt ID</p>
                      <p className="font-black font-mono text-violet-600">{selectedProtein.uniprot_id || selectedProtein.name}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Dataset</p>
                      <p className="font-black">{selectedProtein.dataset}-dataset</p>
                    </div>
                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-teal-600 mb-1">Thuốc liên kết</p>
                      <p className="text-2xl font-black text-teal-600">{selectedProtein.related_drugs}</p>
                    </div>
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-rose-600 mb-1">Bệnh liên kết</p>
                      <p className="text-2xl font-black text-rose-600">{selectedProtein.related_diseases}</p>
                    </div>
                  </div>

                  {/* External Links */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Liên kết ngoài</p>
                    {[
                      { label: 'UniProt', url: `https://www.uniprot.org/uniprot/${selectedProtein.uniprot_id || selectedProtein.name}`, color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
                      { label: 'NCBI Protein', url: `https://www.ncbi.nlm.nih.gov/protein/?term=${selectedProtein.uniprot_id || selectedProtein.name}`, color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' },
                      { label: 'RCSB PDB', url: `https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22parameters%22%3A%7B%22value%22%3A%22${selectedProtein.uniprot_id || selectedProtein.name}%22%7D%7D%7D`, color: 'bg-violet-50 hover:bg-violet-100 text-violet-700' },
                      { label: 'AlphaFold', url: `https://alphafold.ebi.ac.uk/entry/${selectedProtein.uniprot_id || selectedProtein.name}`, color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
                    ].map(link => (
                      <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${link.color}`}>
                        {link.label}
                        <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Liên kết */}
              {modalTab === 'links' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center text-slate-400 text-xs font-bold">
                    <p>Chi tiết liên kết thuốc và bệnh cho <span className="font-mono text-violet-600">{selectedProtein.name}</span></p>
                    <p className="mt-1 text-slate-300">Có <strong className="text-teal-600">{selectedProtein.related_drugs}</strong> thuốc và <strong className="text-rose-600">{selectedProtein.related_diseases}</strong> bệnh liên kết</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-teal-600">💊 Thuốc liên kết</p>
                      {selectedProtein.related_drugs === 0 ? (
                        <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">Không có liên kết thuốc</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {Array.from({length: Math.min(selectedProtein.related_drugs, 10)}, (_, i) => (
                            <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-lg">Thuốc #{i+1}</span>
                          ))}
                          {selectedProtein.related_drugs > 10 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">+{selectedProtein.related_drugs - 10} nữa</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-rose-600">❤️ Bệnh liên kết</p>
                      {selectedProtein.related_diseases === 0 ? (
                        <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">Không có liên kết bệnh</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {Array.from({length: Math.min(selectedProtein.related_diseases, 10)}, (_, i) => (
                            <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg">Bệnh #{i+1}</span>
                          ))}
                          {selectedProtein.related_diseases > 10 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">+{selectedProtein.related_diseases - 10} nữa</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Cấu trúc */}
              {modalTab === 'structure' && (
                <div className="space-y-4">
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2">
                      🧬 Cấu trúc 3D của <span className="font-mono">{selectedProtein.name}</span>
                    </p>
                    <p className="text-[10px] text-violet-600 dark:text-violet-500">
                      Cấu trúc phân tử được cung cấp bởi UniProt / AlphaFold / RCSB PDB
                    </p>
                  </div>

                  {/* Links to structure viewers */}
                  <div className="grid grid-cols-1 gap-3">
                    <a
                      href={`https://www.uniprot.org/uniprot/${selectedProtein.uniprot_id || selectedProtein.name}#structure`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-5 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black transition-all"
                    >
                      <span>🔬 Xem cấu trúc trên UniProt</span>
                      <ExternalLink size={16}/>
                    </a>
                    <a
                      href={`https://alphafold.ebi.ac.uk/entry/${selectedProtein.uniprot_id || selectedProtein.name}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-5 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-black transition-all"
                    >
                      <span>🧬 Xem cấu trúc 3D trên AlphaFold</span>
                      <ExternalLink size={16}/>
                    </a>
                    <a
                      href={`https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22parameters%22%3A%7B%22value%22%3A%22${selectedProtein.uniprot_id || selectedProtein.name}%22%7D%7D%7D`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-5 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black transition-all"
                    >
                      <span>🏗️ Xem cấu trúc 3D trên RCSB PDB</span>
                      <ExternalLink size={16}/>
                    </a>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    * Cấu trúc phân tử được cung cấp bởi UniProt / AlphaFold / PDB (nguồn bên ngoài)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
