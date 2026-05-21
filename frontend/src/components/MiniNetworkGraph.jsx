import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function MiniNetworkGraph({ datasetKey, drugs, diseases, links, onNodeClick }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 280, height: 350 });

  // Số liệu chuẩn từ paper — hardcode fallback
  const DATASET_STATS = {
    B: { drugs: 269, diseases: 598, dd_links: 18416 },
    C: { drugs: 663, diseases: 409, dd_links: 2532 },
    F: { drugs: 593, diseases: 313, dd_links: 1933 },
  };

  const graphData = useMemo(() => {
    // Tăng số lượng node hiển thị để biểu đồ trông dày đặc hơn (nhưng vẫn có giới hạn để không gây lag trang chủ)
    const drugCount = Math.min(drugs || stats.drugs, 80);
    const diseaseCount = Math.min(diseases || stats.diseases, 80);
    const edgeCount = Math.min(links || stats.dd_links, 250);

    const realDrugs = [
      'Aspirin', 'Ibuprofen', 'Paracetamol', 'Amoxicillin', 'Omeprazole', 
      'Metformin', 'Simvastatin', 'Lisinopril', 'Amlodipine', 'Losartan',
      'Atorvastatin', 'Azithromycin', 'Ciprofloxacin', 'Clopidogrel', 'Pantoprazole',
      'Citalopram', 'Escitalopram', 'Fluoxetine', 'Sertraline', 'Tramadol',
      'Gabapentin', 'Levothyroxine', 'Prednisone', 'Furosemide', 'Metoprolol'
    ];

    const nodes = [
      ...Array.from({ length: drugCount }, (_, i) => ({
        id: `d${i}`, group: 'drug', label: realDrugs[i % realDrugs.length], name: realDrugs[i % realDrugs.length]
      })),
      ...Array.from({ length: diseaseCount }, (_, i) => ({
        id: `dis${i}`, group: 'disease', label: `Disease ${i+1}`, name: `Disease ${i+1}`
      })),
    ];

    const newLinks = Array.from({ length: edgeCount }, () => ({
      source: `d${Math.floor(Math.random() * drugCount)}`,
      target: `dis${Math.floor(Math.random() * diseaseCount)}`,
    }));

    return { nodes, links: newLinks };
  }, [datasetKey, drugs, diseases, links]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: 350
      });
    }
    
    // Auto-fit after data is loaded
    if (fgRef.current) {
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(200, 10);
        }
      }, 500);
    }
  }, [graphData]);

  const [hoverNode, setHoverNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

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
    let color = '#10b981'; // protein (though we don't have them here)
    
    if (n.group === 'drug') { radius = 6; color = '#3b82f6'; }
    else if (n.group === 'disease') { radius = 4; color = '#ef4444'; }
    
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    if (isHi) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    }
    
    ctx.restore();
  }, [hoverNode, highlightNodes]);

  const paintLink = useCallback((l, ctx, scale) => {
    const isHi = highlightLinks.has(l);
    ctx.save();
    ctx.globalAlpha = hoverNode && !isHi ? 0.05 : 0.4;
    ctx.strokeStyle = isHi ? '#f59e0b' : '#334155';
    ctx.lineWidth = isHi ? 2 / scale : 0.8 / scale;
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
    ctx.restore();
  }, [hoverNode, highlightLinks]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '350px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeHover={handleNodeHover}
        onNodeClick={onNodeClick}
        cooldownTicks={100}
        d3VelocityDecay={0.2}
      />
    </div>
  );
}
