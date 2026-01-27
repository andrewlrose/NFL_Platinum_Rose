import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function ManageExpertsModal({ isOpen, onClose, experts, onAddExpert }) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState("Sharp");
  if (!isOpen) return null;
  const handleAdd = () => { if(!name || !source) return alert("Name and Source required"); onAddExpert({ name, firstName: name.split(' ')[0], type, source }); setName(""); setSource(""); onClose(); };
  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6"><h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UserPlus size={24} className="text-emerald-400"/> Add New Expert</h3><div className="space-y-4"><div><label className="text-xs text-gray-400">Full Name</label><input className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Dave Tuley"/></div><div><label className="text-xs text-gray-400">Source / Show</label><input className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white" value={source} onChange={e=>setSource(e.target.value)} placeholder="e.g. Tuley's Takes"/></div><div><label className="text-xs text-gray-400">Type</label><select className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white" value={type} onChange={e=>setType(e.target.value)}><option>Sharp</option><option>Media</option><option>Analyst</option><option>Model</option></select></div><div className="flex gap-3 pt-2"><button onClick={onClose} className="w-1/2 py-2 text-gray-400 hover:text-white border border-gray-700 rounded">Cancel</button><button onClick={handleAdd} className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded">Add Expert</button></div></div></div></div>
  );
}