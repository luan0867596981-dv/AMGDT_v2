import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Download, Maximize, PlayCircle, Network, X, Info, Layers, Clipboard } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

export default function DatasetGraph({ datasetName }) {
  const getDatasetKey = (name) => {
    if (!name) return 'C';
    if (name === 'all') return 'all';
    return name[0];
  };

  const datasetMaxLimits = {
    B: { drugs: 269, diseases: 598 },
    C: { drugs: 663, diseases: 409 },
    F: { drugs: 593, diseases: 313 },
    all: { drugs: 1525, diseases: 1320 }
  };

  const [dataset, setDataset] = useState(getDatasetKey(datasetName));
  const [drugLimit, setDrugLimit] = useState(30);
  const [diseaseLimit, setDiseaseLimit] = useState(60);
  const [showProtein, setShowProtein] = useState(false);
  const [search, setSearch] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [modalTab, setModalTab] = useState('summary');
  const [detailDataset, setDetailDataset] = useState(dataset === 'all' ? 'B' : dataset);
  const [detailLinkType, setDetailLinkType] = useState('all');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const [detailData, setDetailData] = useState([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sync detailDataset when global dataset changes
  useEffect(() => {
    if (dataset && dataset !== 'all') {
      setDetailDataset(dataset);
    }
  }, [dataset]);

  // Reset page when dataset, link type or search changes
  useEffect(() => {
    setDetailPage(1);
  }, [detailDataset, detailLinkType, detailSearch]);

  useEffect(() => {
    if (!showStatsModal || modalTab !== 'details') return;
    setDetailLoading(true);
    const limit = 10;
    const dsParam = detailDataset + '-dataset';
    fetch(`http://127.0.0.1:8000/graph/connections?dataset=${dsParam}&link_type=${detailLinkType}&page=${detailPage}&limit=${limit}&search=${encodeURIComponent(detailSearch)}`)
      .then(r => r.json())
      .then(d => {
        setDetailData(d.data || []);
        setDetailTotal(d.total || 0);
      })
      .catch(e => console.error(e))
      .finally(() => setDetailLoading(false));
  }, [showStatsModal, modalTab, detailDataset, detailLinkType, detailSearch, detailPage]);


  // Sync sliders limits when dataset changes to prevent values exceeding max bounds
  useEffect(() => {
    const maxD = datasetMaxLimits[dataset]?.drugs || 200;
    const maxDi = datasetMaxLimits[dataset]?.diseases || 300;
    setDrugLimit(prev => Math.min(prev, maxD));
    setDiseaseLimit(prev => Math.min(prev, maxDi));
  }, [dataset]);

  // Sync with global datasetName selection from header
  useEffect(() => {
    if (datasetName) {
      setDataset(getDatasetKey(datasetName));
    }
  }, [datasetName]);
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const [availableNodes, setAvailableNodes] = useState({ drugs: [], diseases: [] });
  
  const fgRef = useRef();

  // Fetch available nodes for autocomplete and reset old graph data when dataset changes
  useEffect(() => {
    setGraphData({ nodes: [], links: [] });
    setStats(null);
    fetch(`http://127.0.0.1:8000/nodes?dataset_name=${dataset === 'all' ? 'all' : dataset + '-dataset'}`)
      .then(r => r.json())
      .then(d => setAvailableNodes(d))
      .catch(e => console.error(e));
  }, [dataset]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const dsParam = dataset === 'all' ? 'all' : dataset;
      const r = await fetch(`http://127.0.0.1:8000/graph/network?dataset=${dsParam}&drug_limit=${drugLimit}&disease_limit=${diseaseLimit}&show_protein=${showProtein}&search=${encodeURIComponent(search)}&show_all=false`);
      const d = await r.json();
      setGraphData({ nodes: d.nodes, links: d.edges });
      setStats(d.stats);
      if (fgRef.current) {
        setTimeout(() => fgRef.current.zoomToFit(400, 50), 500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFit = () => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 50);
  };

  const handleExport = () => {
    if (!fgRef.current) return;
    const canvas = document.querySelector('.force-graph-container canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `AMNTDDA_Graph_${dataset}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleNodeHover = useCallback((n) => {
    const nH = new Set();
    const lH = new Set();
    if (n) {
      nH.add(n.id);
      graphData.links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (s === n.id || t === n.id) {
          lH.add(l);
          nH.add(s);
          nH.add(t);
        }
      });
    }
    setHoverNode(n);
    setHighlightNodes(nH);
    setHighlightLinks(lH);
  }, [graphData]);

  const paintNode = useCallback((n, ctx, scale) => {
    const isHi = highlightNodes.has(n.id);
    const isDim = hoverNode && !isHi;
    
    ctx.save();
    ctx.globalAlpha = isDim ? 0.15 : 1;
    
    let radius = 5;
    let color = '#10b981'; // protein
    
    if (n.group === 'drug') { radius = 8; color = '#3b82f6'; }
    else if (n.group === 'disease') { radius = 6; color = '#ef4444'; }
    
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    if (isHi) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3 / scale;
      ctx.stroke();
    }
    
    if (showLabels || isHi || scale > 2.5) {
      const fs = 10 / scale;
      ctx.font = `bold ${fs}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2e8f0'; 
      ctx.fillText(n.label, n.x, n.y + radius + 2/scale + fs/2);
    }
    
    ctx.restore();
  }, [hoverNode, highlightNodes, showLabels]);

  const paintLink = useCallback((l, ctx, scale) => {
    const isHi = highlightLinks.has(l);
    ctx.save();
    ctx.globalAlpha = hoverNode && !isHi ? 0.05 : 0.4;
    ctx.strokeStyle = isHi ? '#f59e0b' : '#94a3b8';
    ctx.lineWidth = isHi ? 3.0 / scale : (l.weight ? (l.weight * 1.5) / scale : 1 / scale);
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
    ctx.restore();
  }, [hoverNode, highlightLinks]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* LEFT COL: Controls */}
      <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r dark:border-slate-800 shadow-2xl z-30 p-8 space-y-8 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3"><Network className="text-teal-500"/> Biểu đồ liên kết</h2>
          <p className="text-xs font-bold text-slate-400 mt-2">Trực quan hoá mạng lưới Thuốc–Bệnh–Protein</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dataset</label>
            <select value={dataset} onChange={e=>setDataset(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold outline-none text-sm focus:ring-2 ring-teal-500/50">
              <option value="C">C-dataset (663 thuốc, 409 bệnh)</option>
              <option value="B">B-dataset (269 thuốc, 598 bệnh)</option>
              <option value="F">F-dataset (593 thuốc, 313 bệnh)</option>
              <option value="all">All datasets (Kết hợp các tập dữ liệu)</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số thuốc hiển thị</label><span className="font-black text-teal-600">{drugLimit} / {datasetMaxLimits[dataset]?.drugs || 200}</span></div>
            <input type="range" min="10" max={datasetMaxLimits[dataset]?.drugs || 200} step="1" value={drugLimit} onChange={e=>setDrugLimit(parseInt(e.target.value))} className="w-full accent-teal-600"/>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số bệnh hiển thị tối đa</label><span className="font-black text-rose-600">{diseaseLimit} / {datasetMaxLimits[dataset]?.diseases || 300}</span></div>
            <input type="range" min="10" max={datasetMaxLimits[dataset]?.diseases || 300} step="1" value={diseaseLimit} onChange={e=>setDiseaseLimit(parseInt(e.target.value))} className="w-full accent-rose-600"/>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">Hiện Protein</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={showProtein} onChange={e=>setShowProtein(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-500"></div>
            </label>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tìm nhanh</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                list="graph-search-list"
                placeholder="Tìm kiếm thuốc / bệnh..." 
                value={search} 
                onChange={e=>setSearch(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 ring-teal-500/50" 
              />
              <datalist id="graph-search-list">
                {availableNodes.drugs?.map(n => <option key={`d-${n}`} value={n}/>)}
                {availableNodes.diseases?.map(n => <option key={`dis-${n}`} value={n}/>)}
              </datalist>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
            {loading ? <span className="animate-pulse">ĐANG TẢI...</span> : <><PlayCircle size={18}/> TẠO BIỂU ĐỒ</>}
          </button>

          <button onClick={() => setShowStatsModal(true)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border dark:border-slate-700">
            <Clipboard size={16} className="text-teal-500" />
            Tóm tắt dữ liệu benchmark
          </button>
        </div>

        {/* Legend */}
        <div className="pt-6 border-t dark:border-slate-800 space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chú thích</h4>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Thuốc</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Bệnh</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Protein</div>
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-slate-400"></div> Liên kết</div>
          </div>
        </div>
      </div>

      {/* RIGHT COL: Graph */}
      <div className="flex-1 relative flex flex-col bg-slate-900 force-graph-container">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/50 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
            <h3 className="font-black text-white text-lg">Mạng lưới liên kết {dataset}-dataset</h3>
            {stats && (
              <p className="text-xs font-bold text-teal-300 mt-1">
                {stats.drug_count} thuốc · {stats.disease_count} bệnh · {stats.total_edges} liên kết
              </p>
            )}
          </div>
          
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/50 backdrop-blur-md border border-white/10 p-2 rounded-2xl">
            <button onClick={handleFit} title="Zoom to Fit" className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Maximize size={18}/></button>
            <button onClick={handleExport} title="Export PNG" className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Download size={18}/></button>
            <button onClick={()=>setShowLabels(!showLabels)} title="Toggle Labels" className={`p-2.5 rounded-xl font-black text-xs transition-all ${showLabels ? 'bg-teal-500 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>TEXT</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 w-full h-full relative">
          {graphData.nodes.length === 0 && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm">
              Nhấn 'Tạo biểu đồ' để bắt đầu
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              backgroundColor="#0f172a"
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              onNodeHover={handleNodeHover}
              onNodeClick={n => setSelectedNode(n)}
              nodeLabel={n => `
                <div style="background: rgba(15, 23, 42, 0.95); color: white; padding: 12px; border-radius: 16px; border: 1px solid rgba(20, 184, 166, 0.3); backdrop-filter: blur(8px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); min-width: 180px;">
                  <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${n.group==='drug'?'#3b82f6':n.group==='disease'?'#ef4444':'#10b981'}; margin-bottom: 4px;">
                    ${n.group === 'drug' ? '💊 DƯỢC PHẨM' : n.group === 'disease' ? '❤️ BỆNH LÝ' : '🌓 PROTEIN'}
                  </div>
                  <div style="font-size: 15px; font-weight: 900; margin-bottom: 4px; color: #f8fafc;">${n.label}</div>
                  <div style="font-size: 11px; opacity: 0.8; font-family: monospace; color: #94a3b8;">ID: ${n.realId || 'N/A'}</div>
                  ${n.dataset ? `<div style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #2dd4bf;">Dataset: ${n.dataset}</div>` : ''}
                  <hr style="margin: 10px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);" />
                  <div style="font-size: 9px; font-weight: bold; color: #5eead4; text-align: center;">Click để xem chi tiết cấu trúc</div>
                </div>
              `}
              cooldownTicks={100}
            />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-20">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedNode && <DetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />}

      {/* BENCHMARK STATS MODAL */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[32px] border dark:border-slate-800 shadow-2xl p-8 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowStatsModal(false)} 
              className="absolute top-6 right-6 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-full transition-all text-slate-400 shadow-sm"
            >
              <X size={20}/>
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <Clipboard className="text-teal-500" size={26} />
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  Dữ liệu Benchmark hệ thống
                </h3>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                  Thông số thực thể, liên kết và chi tiết phân phối phân tách theo từng tập dữ liệu chuẩn
                </p>
              </div>
            </div>

            {/* Tabs Header */}
            <div className="flex border-b dark:border-slate-800 mb-6 gap-6">
              <button 
                onClick={() => setModalTab('summary')}
                className={`pb-3 font-black text-xs uppercase tracking-widest transition-all relative ${modalTab === 'summary' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                Tổng quan benchmark
              </button>
              <button 
                onClick={() => setModalTab('details')}
                className={`pb-3 font-black text-xs uppercase tracking-widest transition-all relative ${modalTab === 'details' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                Chi tiết liên kết thực tế ({detailDataset}-dataset)
              </button>
            </div>

            {modalTab === 'summary' ? (
              <>
                {/* Table Content */}
                <div className="overflow-x-auto border dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Dataset</th>
                        <th className="px-6 py-4 text-center">Thuốc</th>
                        <th className="px-6 py-4 text-center">Bệnh</th>
                        <th className="px-6 py-4 text-center">Protein</th>
                        <th className="px-6 py-4 text-center">Liên kết Thuốc–Bệnh</th>
                        <th className="px-6 py-4 text-center">Liên kết Thuốc–Protein</th>
                        <th className="px-6 py-4 text-center">Liên kết Bệnh–Protein</th>
                        <th className="px-6 py-4 text-right">Sparsity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {[
                        { dataset: 'B-dataset', drugs: 269, diseases: 598, proteins: 1021, drug_disease: 18416, drug_protein: 3110, disease_protein: 5898, sparsity: '0.1144', colorClass: 'text-indigo-600 dark:text-indigo-400' },
                        { dataset: 'C-dataset', drugs: 663, diseases: 409, proteins: 993, drug_disease: 2532, drug_protein: 3773, disease_protein: 10734, sparsity: '0.0093', colorClass: 'text-teal-600 dark:text-teal-400' },
                        { dataset: 'F-dataset', drugs: 593, diseases: 313, proteins: 2741, drug_disease: 1933, drug_protein: 3243, disease_protein: 54265, sparsity: '0.0104', colorClass: 'text-purple-600 dark:text-purple-400' },
                      ].map((row, idx) => (
                        <tr key={row.dataset} className="text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className={`px-6 py-4 font-black uppercase tracking-tight ${row.colorClass}`}>{row.dataset}</td>
                          <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400 font-extrabold">{row.drugs.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-rose-600 dark:text-rose-400 font-extrabold">{row.diseases.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-extrabold">{row.proteins.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300 font-bold">{row.drug_disease.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300 font-bold">{row.drug_protein.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300 font-bold">{row.disease_protein.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-mono font-semibold">{row.sparsity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer info */}
                <div className="mt-6 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  <span>* Bảng tóm tắt thông số phân phối benchmark</span>
                  <span>* Nguồn: Table 1 — Summary of three benchmark datasets (Paper gốc)</span>
                </div>
              </>
            ) : (
              <>
                {/* Filter Panel */}
                <div className="flex flex-wrap gap-4 items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tập dữ liệu:</span>
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                      {['B', 'C', 'F'].map(ds => (
                        <button
                          key={ds}
                          onClick={() => setDetailDataset(ds)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${detailDataset === ds ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:text-teal-500'}`}
                        >
                          {ds}-dataset
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Loại liên kết:</span>
                    <select 
                      value={detailLinkType} 
                      onChange={e => setDetailLinkType(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-200"
                    >
                      <option value="all">Tất cả liên kết</option>
                      <option value="drug_disease">Thuốc – Bệnh</option>
                      <option value="drug_protein">Thuốc – Protein</option>
                      <option value="disease_protein">Bệnh – Protein</option>
                    </select>
                  </div>

                  <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Tìm tên thực thể..."
                      value={detailSearch}
                      onChange={e => setDetailSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Table Data */}
                {detailLoading ? (
                  <div className="py-20 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : detailData.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Không tìm thấy liên kết nào khớp
                  </div>
                ) : (
                  <div className="overflow-x-auto border dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Thực thể 1 (Source)</th>
                          <th className="px-6 py-4">Loại liên kết</th>
                          <th className="px-6 py-4">Thực thể 2 (Target)</th>
                          <th className="px-6 py-4 text-center">Độ dày / Trọng số (Weight)</th>
                          <th className="px-6 py-4 text-right">Chi tiết liên kết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {detailData.map((row, idx) => {
                          const sourceColor = row.source_type === 'drug' ? 'text-blue-500' : 'text-rose-500';
                          const targetColor = row.target_type === 'protein' ? 'text-emerald-500' : row.target_type === 'disease' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200';
                          return (
                            <tr key={idx} className="text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 uppercase">{row.source_type}</span>
                                  <span className={`text-sm font-black ${sourceColor}`}>{row.source}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] uppercase font-black tracking-wider">
                                  {row.type_label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 uppercase">{row.target_type}</span>
                                  <span className={`text-sm font-black ${targetColor}`}>{row.target}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 justify-center">
                                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{row.weight}</span>
                                  <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border dark:border-slate-700">
                                    <div 
                                      className="bg-teal-500 h-full rounded-full" 
                                      style={{ width: `${Math.min(100, ((row.weight - 1.0) / 4.0) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-medium">
                                {row.details}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {detailTotal > 0 && (
                  <div className="mt-6 flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500">
                      Hiển thị liên kết {Math.min(detailTotal, (detailPage - 1) * 10 + 1)} - {Math.min(detailTotal, detailPage * 10)} trong số <strong>{detailTotal.toLocaleString()}</strong> liên kết thực tế
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={detailPage === 1 || detailLoading}
                        onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
                      >
                        Trang trước
                      </button>
                      <span className="px-4 py-2 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-900/60 rounded-xl text-xs font-black text-teal-600 dark:text-teal-400">
                        Trang {detailPage} / {Math.ceil(detailTotal / 10)}
                      </span>
                      <button 
                        disabled={detailPage * 10 >= detailTotal || detailLoading}
                        onClick={() => setDetailPage(p => p + 1)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
                      >
                        Trang sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailDrawer({ node, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [zoom, setZoom] = useState(3.5);
  
  const isDrug = node.group === 'drug';

  const getImgUrl = () => {
    const d_name = node.label.replace('Drug_','').trim();
    const urls = [];
    if (node.smiles) urls.push(`https://www.simolecule.com/cdkdepict/depict/bow/svg?smi=${encodeURIComponent(node.smiles)}&w=400&h=400&abbr=on&hdisp=bridgehead&zoom=1.6`);
    urls.push(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(d_name)}/PNG?record_type=2d&image_size=large`);
    if (node.realId && node.realId.startsWith('DB')) urls.push(`https://go.drugbank.com/structures/small_molecule_drugs/${node.realId}.svg`);
    urls.push(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(d_name)}/image`);
    urls.push(`https://placehold.co/400x400/f8fafc/0d9488?text=${encodeURIComponent(d_name.substring(0, 12))}`);
    return urls[Math.min(imgIndex, urls.length - 1)];
  };

  return (
    <div className="absolute top-6 left-6 bottom-6 w-[600px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-[40px] shadow-2xl z-50 flex flex-col p-10 animate-in slide-in-from-left duration-500">
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1 truncate pr-4">
          <span className={`px-4 py-1 text-[10px] font-black rounded-full uppercase ${isDrug?'bg-blue-100 text-blue-700':'bg-rose-100 text-rose-700'}`}>{node.group}</span>
          <h4 className="font-black text-3xl mt-3 dark:text-white truncate" title={node.label}>{node.label}</h4>
          <p className="text-[12px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ID: <span className="text-teal-600 font-black">{node.realId||'N/A'}</span></p>
        </div>
        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-full transition-all text-slate-400 shadow-sm"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        {isDrug ? (
             <div className="aspect-square bg-white rounded-[40px] border border-slate-100 p-8 shadow-inner flex items-center justify-center overflow-hidden group relative cursor-zoom-in">
                <img 
                  key={`${node.id}-${imgIndex}`}
                  src={getImgUrl()} 
                  alt="Structure" 
                  referrerPolicy="no-referrer"
                  style={{ transform: `scale(${zoom})` }}
                  className="w-full h-full object-contain transition-transform duration-200 pointer-events-none" 
                  onError={() => setImgIndex(prev => prev + 1)}
                />
             </div>
        ) : (
          <div className="aspect-square bg-rose-50/50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30 flex flex-col items-center justify-center p-10 text-center">
             <Info size={48} className="text-rose-300 mb-4" />
             <p className="font-black text-rose-500 uppercase text-[10px] tracking-widest">{node.group === 'disease' ? 'Disease Entity' : 'Protein Entity'}</p>
             <p className="text-xs text-slate-400 mt-4 leading-relaxed">Thông tin cấu trúc hóa học không khả dụng cho thực thể này.</p>
          </div>
        )}

        {node.smiles && (
          <div className="space-y-4">
            <span className="text-[12px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-[0.2em]"><Layers size={18} className="text-teal-500"/> SMILES Notation</span>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-slate-800 group relative">
              <p className="text-[13px] font-mono break-all text-slate-700 dark:text-slate-200 font-bold leading-relaxed">{node.smiles}</p>
              <button className="absolute top-4 right-4 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-700 rounded-xl shadow-md border dark:border-slate-600">
                <Clipboard size={16} className="text-teal-600"/>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-8 border-t dark:border-slate-800 mt-4">
        <button onClick={onClose} className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">ĐÓNG CHI TIẾT</button>
      </div>
    </div>
  );
}

