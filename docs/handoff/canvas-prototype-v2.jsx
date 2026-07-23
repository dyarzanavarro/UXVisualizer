import React, { useState, useRef, useCallback } from 'react';
import { Link2, Image as ImageIcon, Mail, X, AlertTriangle, CheckCircle2, Play, Upload, Trash2 } from 'lucide-react';

const initialNodes = [
  {
    id: 'n1', type: 'url', x: 60, y: 160, label: 'Homepage', sub: 'mybacs.ch',
    score: 78, imageSrc: null, emailText: null,
    findings: [
      { id: 'PC-035', verdict: 'present', text: 'Trustpilot 4.6 badge + press logos build immediate authority.' },
      { id: 'PC-072', verdict: 'absent_where_expected', text: 'No guarantee/risk-reversal signal on this page.' },
    ],
  },
  {
    id: 'n2', type: 'url', x: 420, y: 100, label: 'Product page', sub: 'Dailybacs® Women',
    score: 84, imageSrc: null, emailText: null,
    findings: [
      { id: 'PC-072', verdict: 'present', text: '60-day money-back guarantee, explicit refund-or-credit choice.' },
      { id: 'PC-041', verdict: 'present', text: 'Honest "not suitable for pregnant/breastfeeding" disclosure.' },
    ],
  },
  {
    id: 'n3', type: 'url', x: 780, y: 160, label: 'Cart', sub: 'Checkout entry',
    score: 71, imageSrc: null, emailText: null,
    findings: [
      { id: 'VA-09', verdict: 'present', text: 'Trustpilot stars carried through into cart.' },
    ],
  },
];

const initialEdges = [
  { id: 'e1', from: 'n1', to: 'n2', status: 'break', findings: [{ type: 'promise_unfulfilled', severity: 'medium', text: 'Homepage promises a free gift on 3-month sub. Product page shows a different threshold-based mechanic, uncross-referenced.' }] },
  { id: 'e2', from: 'n2', to: 'n3', status: 'ok', findings: [{ type: 'confirmed', severity: 'none', text: 'Trust signals carry through cleanly into cart.' }] },
];

const typeIcon = { url: Link2, image: ImageIcon, email: Mail };
const scoreColor = (s) => (s >= 80 ? '#3fb88c' : s >= 60 ? '#e3a008' : '#d9603a');
const NODE_W = 220, NODE_H = 92;

export default function CanvasPrototype() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [dragId, setDragId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState({ kind: null, id: null });
  const [connecting, setConnecting] = useState(null);
  const [emailModalId, setEmailModalId] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingImageNodeId = useRef(null);

  const getRect = () => canvasRef.current.getBoundingClientRect();

  const onNodeMouseDown = (e, id) => {
    if (e.target.closest('[data-handle]') || e.target.closest('[data-noderag]')) return;
    const node = nodes.find((n) => n.id === id);
    const rect = getRect();
    setDragId(id);
    setOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
    setSelected({ kind: 'node', id });
  };

  const onCanvasMouseMove = useCallback((e) => {
    const rect = getRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragId) {
      setNodes((prev) => prev.map((n) => (n.id === dragId ? { ...n, x: Math.max(0, mx - offset.x), y: Math.max(0, my - offset.y) } : n)));
    }
    if (connecting) {
      setConnecting((c) => ({ ...c, x: mx, y: my }));
    }
  }, [dragId, offset, connecting]);

  const onCanvasMouseUp = (e) => {
    setDragId(null);
    if (connecting) {
      const target = e.target.closest('[data-node-id]');
      if (target) {
        const toId = target.getAttribute('data-node-id');
        if (toId !== connecting.fromId) {
          const exists = edges.some((ed) => (ed.from === connecting.fromId && ed.to === toId) || (ed.from === toId && ed.to === connecting.fromId));
          if (!exists) {
            setEdges((prev) => [...prev, { id: 'e' + Date.now(), from: connecting.fromId, to: toId, status: 'unanalyzed', findings: [{ type: 'not_yet_analyzed', severity: 'none', text: 'Run analysis to score this seam.' }] }]);
          }
        }
      }
      setConnecting(null);
    }
  };

  const startConnect = (e, id) => {
    e.stopPropagation();
    const rect = getRect();
    setConnecting({ fromId: id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const addUrlNode = () => {
    const id = 'n_' + Date.now();
    setNodes((p) => [...p, { id, type: 'url', x: 100 + Math.random() * 300, y: 340 + Math.random() * 60, label: 'New URL', sub: 'Paste link, not analyzed', score: null, findings: [], imageSrc: null, emailText: null }]);
  };

  const triggerImageUpload = () => {
    const id = 'n_' + Date.now();
    setNodes((p) => [...p, { id, type: 'image', x: 100 + Math.random() * 300, y: 340 + Math.random() * 60, label: 'New image', sub: 'Not analyzed yet', score: null, findings: [], imageSrc: null, emailText: null }]);
    pendingImageNodeId.current = id;
    fileInputRef.current.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNodes((prev) => prev.map((n) => (n.id === pendingImageNodeId.current ? { ...n, imageSrc: ev.target.result, sub: file.name } : n)));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addEmailNode = () => {
    const id = 'n_' + Date.now();
    setNodes((p) => [...p, { id, type: 'email', x: 100 + Math.random() * 300, y: 340 + Math.random() * 60, label: 'New email', sub: 'Paste content →', score: null, findings: [], imageSrc: null, emailText: null }]);
    setEmailModalId(id);
    setEmailDraft('');
  };

  const saveEmail = () => {
    setNodes((prev) => prev.map((n) => (n.id === emailModalId ? { ...n, emailText: emailDraft, sub: emailDraft.split('\n')[0]?.slice(0, 40) || 'Pasted email' } : n)));
    setEmailModalId(null);
  };

  const deleteNode = (id) => {
    setNodes((p) => p.filter((n) => n.id !== id));
    setEdges((p) => p.filter((e) => e.from !== id && e.to !== id));
    if (selected.id === id) setSelected({ kind: null, id: null });
  };

  const deleteEdge = (id) => {
    setEdges((p) => p.filter((e) => e.id !== id));
    if (selected.id === id) setSelected({ kind: null, id: null });
  };

  const nodeCenter = (id) => {
    const n = nodes.find((n) => n.id === id);
    return n ? { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 } : { x: 0, y: 0 };
  };

  const edgeColor = (status) => (status === 'ok' ? '#3fb88c' : status === 'break' ? '#e3a008' : '#4a5160');

  const selectedNode = selected.kind === 'node' ? nodes.find((n) => n.id === selected.id) : null;
  const selectedEdge = selected.kind === 'edge' ? edges.find((e) => e.id === selected.id) : null;

  return (
    <div className="w-full h-screen bg-neutral-950 text-neutral-100 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

      <div className="border-b border-neutral-800 px-5 py-3 flex items-center justify-between bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight">funnel/seams</span>
          <span className="text-neutral-500 text-xs ml-2">canvas · drag handles to connect</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addUrlNode} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition"><Link2 size={13} /> Add URL</button>
          <button onClick={triggerImageUpload} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition"><Upload size={13} /> Upload image</button>
          <button onClick={addEmailNode} className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition"><Mail size={13} /> Paste email</button>
          <button className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-md transition font-medium ml-2"><Play size={13} /> Run analysis</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {edges.map((edge) => {
              const from = nodeCenter(edge.from), to = nodeCenter(edge.to);
              const color = edgeColor(edge.status);
              return (
                <g key={edge.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2} strokeDasharray={edge.status === 'unanalyzed' ? '2,4' : '5,5'} className="pointer-events-auto cursor-pointer" onClick={() => setSelected({ kind: 'edge', id: edge.id })} />
                  <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={9} fill={color} className="pointer-events-auto cursor-pointer" onClick={() => setSelected({ kind: 'edge', id: edge.id })} />
                </g>
              );
            })}
            {connecting && (() => { const f = nodeCenter(connecting.fromId); return <line x1={f.x} y1={f.y} x2={connecting.x} y2={connecting.y} stroke="#6b7280" strokeWidth={2} strokeDasharray="3,3" />; })()}
          </svg>

          {nodes.map((node) => {
            const Icon = typeIcon[node.type] || Link2;
            const isSelected = selected.kind === 'node' && selected.id === node.id;
            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                className="absolute rounded-lg border select-none group"
                style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H, zIndex: 2, background: '#171b21', borderColor: isSelected ? '#3fb88c' : '#2a3038', boxShadow: isSelected ? '0 0 0 1px #3fb88c' : 'none', cursor: 'grab' }}
              >
                {node.imageSrc && <img src={node.imageSrc} alt="" className="w-full h-20 object-cover rounded-t-lg" />}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-neutral-400"><Icon size={12} /><span className="text-[10px] uppercase tracking-wide">{node.type}</span></div>
                    <div className="flex items-center gap-2">
                      {node.score !== null && <span className="text-xs font-mono font-semibold" style={{ color: scoreColor(node.score) }}>{node.score}</span>}
                      <button data-noderag onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="font-medium text-sm">{node.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">{node.sub}</div>
                </div>
                <div
                  data-handle
                  onMouseDown={(e) => startConnect(e, node.id)}
                  title="Drag to connect to another step"
                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-neutral-700 border-2 border-neutral-950 hover:bg-emerald-500 cursor-crosshair"
                />
              </div>
            );
          })}
        </div>

        <div className="w-80 border-l border-neutral-800 bg-neutral-900 p-4 overflow-y-auto">
          {!selectedNode && !selectedEdge && <div className="text-sm text-neutral-500 mt-8 text-center">Click a node or seam to see findings.<br /><br />Drag the small dot on a node's right edge to another node to draw a new seam.</div>}

          {selectedNode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{selectedNode.label}</div>
                <button onClick={() => setSelected({ kind: null, id: null })} className="text-neutral-500 hover:text-neutral-300"><X size={14} /></button>
              </div>
              <div className="text-xs text-neutral-500 mb-4">{selectedNode.sub}</div>
              {selectedNode.emailText && <div className="text-xs text-neutral-400 bg-neutral-800 rounded p-2 mb-4 whitespace-pre-wrap max-h-32 overflow-y-auto">{selectedNode.emailText}</div>}
              {selectedNode.score !== null ? (
                <>
                  <div className="text-2xl font-mono font-semibold mb-4" style={{ color: scoreColor(selectedNode.score) }}>{selectedNode.score}<span className="text-sm text-neutral-500">/100</span></div>
                  <div className="space-y-3">
                    {selectedNode.findings.map((f, i) => (
                      <div key={i} className="text-xs border-l-2 pl-2.5" style={{ borderColor: f.verdict === 'present' ? '#3fb88c' : '#e3a008' }}>
                        <div className="font-mono text-neutral-500 mb-0.5">{f.id} · {f.verdict.replace(/_/g, ' ')}</div>
                        <div className="text-neutral-300 leading-relaxed">{f.text}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-xs text-neutral-500 italic">Not analyzed yet.</div>}
            </div>
          )}

          {selectedEdge && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  {selectedEdge.status === 'ok' ? <CheckCircle2 size={14} color="#3fb88c" /> : selectedEdge.status === 'break' ? <AlertTriangle size={14} color="#e3a008" /> : <span className="w-3.5 h-3.5 rounded-full bg-neutral-600 inline-block" />}
                  Seam finding
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteEdge(selectedEdge.id)} className="text-neutral-600 hover:text-red-400"><Trash2 size={13} /></button>
                  <button onClick={() => setSelected({ kind: null, id: null })} className="text-neutral-500 hover:text-neutral-300"><X size={14} /></button>
                </div>
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

      {emailModalId && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEmailModalId(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-[480px]" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">Paste transactional email</div>
            <textarea autoFocus value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="Subject: Your order confirmation..." className="w-full h-40 bg-neutral-800 text-xs rounded p-2 text-neutral-200 outline-none border border-neutral-700 focus:border-emerald-500" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setEmailModalId(null)} className="text-xs px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-200">Cancel</button>
              <button onClick={saveEmail} className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
