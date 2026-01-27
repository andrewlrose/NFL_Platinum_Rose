import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, FileText } from 'lucide-react';

export default function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  if (!isOpen) return null;
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.txt'));
    if (invalidFiles.length > 0) { alert(`❌ UNSUPPORTED FORMAT\n\nThe following files are not .txt files:\n${invalidFiles.map(f=>f.name).join('\n')}\n\nPlease save them as "Plain Text (.txt)" in Word and try again.`); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    setIsUploading(true);
    try {
      const filePromises = files.map(file => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (event) => { resolve({ fileName: file.name, content: event.target.result }); }; reader.onerror = (error) => reject(error); reader.readAsText(file); }); });
      const results = await Promise.all(filePromises);
      const newTranscripts = results.map(res => ({ id: Date.now() + Math.random(), date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), source: res.fileName.replace(/\.txt$/i, ''), text: res.content }));
      onUploadComplete(newTranscripts); onClose();
    } catch (error) { console.error("Bulk upload error:", error); alert("Error reading files. Please try again."); } finally { setIsUploading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 text-center">
        <div className="flex justify-center text-emerald-400 mb-4"><Upload size={48} /></div><h3 className="text-xl font-bold text-white mb-2">Bulk Ingest Transcripts</h3>
        <p className="text-sm text-gray-400 mb-6">Select multiple text files (.txt). We use the <strong>Filename</strong> as the Source.</p>
        {isUploading ? (<div className="flex flex-col items-center justify-center text-emerald-400"><RefreshCw className="animate-spin mb-2" size={24}/><span>Reading files...</span></div>) : (<div className="flex flex-col gap-3"><button onClick={() => fileInputRef.current.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"><FileText size={18}/> Select Files</button><input type="file" multiple accept=".txt" ref={fileInputRef} className="hidden" onChange={handleFiles} /><button onClick={onClose} className="text-gray-500 hover:text-white text-sm mt-2">Cancel</button></div>)}
      </div>
    </div>
  );
}