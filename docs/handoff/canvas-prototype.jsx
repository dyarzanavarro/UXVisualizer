import React, { useState, useRef, useCallback } from 'react';
import { Link2, Image as ImageIcon, Mail, Plus, X, AlertTriangle, CheckCircle2, Play } from 'lucide-react';

const initialNodes = [
  {
    id: 'n1', type: 'url', x: 80, y: 140, label: 'Homepage', sub: 'mybacs.ch',
    score: 78,
    findings: [
      { id: 'PC-035', verdict: 'present', text: 'Trustpilot 4.6 badge + press logos build immediate authority.' },
      { id: 'VA-06', verdict: 'present', text: 'Named scientific advisory board with credentials shown.' },
      { id: 'PC-072', verdict: 'absent_where_expected', text: 'No guarantee/risk-reversal signal on this page — appears only on product page.' },
    ],
  },
  {
    id: 'n2', type: 'url', x: 420, y: 100, label: 'Product page', sub: 'Dailybacs® Women',
    score: 84,
    findings: [
      { id: 'PC-068', verdict: 'present', text: 'Per-day pricing shown alongside subscription tiers.' },
      { id: 'PC-072', verdict: 'present', text: '60-day money-back guarantee, explicit refund-or-credit choice.' },
      { id: 'PC-041', verdict: 'present', text: 'Honest "not suitable for pregnant/breastfeeding" disclosure builds credibility.' },
    ],
  },
  {
    id: 'n3', type: 'url', x: 760, y: 160, label: 'Cart', sub: 'Checkout entry',
    score: 71,
    findings: [
      { id: 'VA-09', verdict: 'present', text: 'Trustpilot stars carried through into cart.' },
      { id: 'other', verdict: 'present', text: 'Free gift correctly applied based on subscription selection.' },
    ],
  },
];

const initialEdges = [
  {
    id: 'e1', from: 'n1', to: 'n2', status: 'break',
    findings: [
      { type: 'promise_unfulfilled', severity: 'medium', text: 'Homepage promises "free gift worth 49.95 CHF" on 3-month sub. Product page shows a different threshold-based mechanic (140 CHF spend) with no cross-reference.' },
    ],
  },
  {
    id: 'e2', from: 'n2', to: 'n3', status: 'ok',
    findings: [
      { type: 'confirmed', severity: 'none', text: 'Trust signals and guarantee context carry through cleanly into cart.' },
    ],
  },
];

const typeIcon = { url: Link2, image: ImageIcon, email: Mail };

function scoreColor(score) {
  if (score >= 80) return '#3fb88c';
  if (score >= 60) return '#e3a008';
  return '#d9603a';
}

export default function CanvasPrototype() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [dragId, setDragId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState({ kind: null, id: null });
  const [analyzed, setAnalyzed] = useState(true);
  const canvasRef = useRef(null);

  const onMouseDown = (e, id) => {
    const node = nodes.find((n) => n.id === id);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragId(id);
    setOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
    setSelected({ kind: 'node', id });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;
    setNodes((prev) => prev.map((n) => (n.id === dragId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
  }, [dragId, offset]);

  const onMouseUp = () => setDragId(null);

  const addNode = (type) => {
    const id = 'n' + (nodes.length + 1) + '_' + Date.now();
    setNodes((prev) => [
      ...prev,
      { id, type, x: 80 + Math.random() * 400, y: 320 + Math.random() * 80, label: type === 'url' ? 'New URL' : type === 'image' ? 'New image' : 'New email', sub: 'Not analyzed yet', score: null, findings: [] },
    ]);
  };

  const runAnalysis = () => setAnalyzed(true);

  const nodeCenter = (id) => {
    const n = nodes.find((n) => n.id === id);
    return { x: n.x + 110, y: n.y + 46 };
  };

  const selectedNode = selected.kind === 'node' ? nodes.find((n) => n.id === selected.id) : null;
  const selectedEdge = selected.kind === 'edge' ? edges.find((e) => e.id === selected.id) : null;

  return (
    <div className="w-full h-screen bg-neutral-950 text-neutral-100 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Toolbar */}
      <div className="border-b border-neutral-800 px-5 py-3 flex items-center justify-between bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight">funnel/seams</span>
          <span className="text-neutral-500 text-xs ml-2">canvas · mybacs.ch demo</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => addNode('url')} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition">
            <Link2 size={13} /> Add URL
          </button>
          <button onClick={() => addNode('image')} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition">
            <ImageIcon size={13} /> Add image
          </button>
          <button onClick={() => addNode('email')} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition">
            <Mail size={13} /> Add email
          </button>
          <button onClick={runAnalysis} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-md transition font-medium ml-2">
            <Play size={13} /> Run analysis
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {edges.map((edge) => {
              const from = nodeCenter(edge.from);
              const to = nodeCenter(edge.to);
              const color = edge.status === 'ok' ? '#3fb88c' : '#e3a008';
              const midX = (from.x + to.x) / 2;
              return (
                <g key={edge.id}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth={2} strokeDasharray="5,5"
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setSelected({ kind: 'edge', id: edge.id })}
                  />
                  <circle cx={midX} cy={(from.y + to.y) / 2} r={9} fill={color}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setSelected({ kind: 'edge', id: edge.id })}
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = typeIcon[node.type] || Link2;
            const isSelected = selected.kind === 'node' && selected.id === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => onMouseDown(e, node.id)}
                className="absolute rounded-lg border cursor-grab active:cursor-grabbing select-none"
                style={{
                  left: node.x, top: node.y, width: 220, zIndex: 2,
                  background: '#171b21',
                  borderColor: isSelected ? '#3fb88c' : '#2a3038',
                  boxShadow: isSelected ? '0 0 0 1px #3fb88c' : 'none',
                }}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Icon size={12} />
                      <span className="text-[10px] uppercase tracking-wide">{node.type}</span>
                    </div>
                    {node.score !== null && (
                      <span className="text-xs font-mono font-semibold" style={{ color: scoreColor(node.score) }}>
                        {node.score}
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-sm">{node.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{node.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        <div className="w-80 border-l border-neutral-800 bg-neutral-900 p-4 overflow-y-auto">
          {!selectedNode && !selectedEdge && (
            <div className="text-sm text-neutral-500 mt-8 text-center">
              Click a node or an edge to see its findings.
            </div>
          )}

          {selectedNode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{selectedNode.label}</div>
                <button onClick={() => setSelected({ kind: null, id: null })} className="text-neutral-500 hover:text-neutral-300">
                  <X size={14} />
                </button>
              </div>
              <div className="text-xs text-neutral-500 mb-4">{selectedNode.sub}</div>
              {selectedNode.score !== null ? (
                <>
                  <div className="text-2xl font-mono font-semibold mb-4" style={{ color: scoreColor(selectedNode.score) }}>
                    {selectedNode.score}<span className="text-sm text-neutral-500">/100</span>
                  </div>
                  <div className="space-y-3">
                    {selectedNode.findings.map((f, i) => (
                      <div key={i} className="text-xs border-l-2 pl-2.5" style={{ borderColor: f.verdict === 'present' ? '#3fb88c' : '#e3a008' }}>
                        <div className="font-mono text-neutral-500 mb-0.5">{f.id} · {f.verdict.replace(/_/g, ' ')}</div>
                        <div className="text-neutral-300 leading-relaxed">{f.text}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500 italic">Not analyzed yet. Click "Run analysis" to score this asset.</div>
              )}
            </div>
          )}

          {selectedEdge && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  {selectedEdge.status === 'ok' ? <CheckCircle2 size={14} color="#3fb88c" /> : <AlertTriangle size={14} color="#e3a008" />}
                  Seam finding
                </div>
                <button onClick={() => setSelected({ kind: null, id: null })} className="text-neutral-500 hover:text-neutral-300">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {selectedEdge.findings.map((f, i) => (
                  <div key={i} className="text-xs border-l-2 pl-2.5" style={{ borderColor: f.severity === 'none' ? '#3fb88c' : '#e3a008' }}>
                    <div className="font-mono text-neutral-500 mb-0.5">{f.type.replace(/_/g, ' ')}{f.severity !== 'none' ? ` · ${f.severity}` : ''}</div>
                    <div className="text-neutral-300 leading-relaxed">{f.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
