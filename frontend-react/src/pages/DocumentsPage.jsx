import React, { useEffect, useState } from 'react'
import useAuth from '../store/auth'
import { DocumentsAPI } from '../api'

function Section({ title, docKey, doc, canUpload, onUpload, onDownload, onRemoveDoc }){
  const hasFile = !!doc
  const fileName = hasFile ? doc.name : 'No file uploaded'
  const uploadedAt = hasFile ? new Date(doc.ts).toLocaleString() : null

  function handleFile(e){
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const payload = { name: file.name, ts: Date.now(), type: file.type, size: file.size, dataUrl: reader.result }
      onUpload(docKey, payload)
    }
    reader.readAsDataURL(file)
  }

  function download(){ if (hasFile) onDownload(docKey) }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-slate-800 mt-1">{fileName}</div>
          {uploadedAt && <div className="text-xs text-slate-500">Uploaded: {uploadedAt}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={download} disabled={!hasFile} title={hasFile?`Download ${fileName}`:'No file'}>Download</button>
          {canUpload && (
            <button
              className="btn btn-outline"
              onClick={()=>{ if (hasFile && confirm('Remove this document?')) onRemoveDoc(docKey) }}
              disabled={!hasFile}
            >Remove</button>
          )}
          {canUpload && (
            <label className="btn cursor-pointer">
              Upload PDF
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage(){
  const { user, token } = useAuth()
  const role = (user?.role || '').toUpperCase()
  const canUpload = role === 'ADMIN'
  const [docs, setDocs] = useState({ companyProfile: null, tradeLicense: null, vatCertificate: null })

  useEffect(()=>{ if(token){ DocumentsAPI.list(token).then(setDocs).catch(()=>{}) } },[token])

  function onUpload(key, payload){
    if (!token) return
    DocumentsAPI.upload(token, key, { name: payload.name, dataUrl: payload.dataUrl })
      .then(meta => setDocs(prev => ({ ...prev, [key]: meta })))
      .catch(err => alert(err.message))
  }

  async function handleRemove(key){
    if (!token) return
    try{
      await DocumentsAPI.remove(token, key)
      setDocs(prev => ({ ...prev, [key]: null }))
    }catch(e){
      alert(e.message || 'Failed to remove document')
    }
  }

  async function onDownload(key){
    try{
      const blob = await DocumentsAPI.downloadBlob(token, key)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (docs?.[key]?.name) || `${key}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }catch(e){
      alert(e.message || 'Download failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Documents</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Company Profile" docKey="companyProfile" doc={docs.companyProfile} canUpload={canUpload} onUpload={onUpload} onDownload={onDownload} onRemoveDoc={handleRemove} />
        <Section title="Trade License" docKey="tradeLicense" doc={docs.tradeLicense} canUpload={canUpload} onUpload={onUpload} onDownload={onDownload} onRemoveDoc={handleRemove} />
        <Section title="VAT Certificate" docKey="vatCertificate" doc={docs.vatCertificate} canUpload={canUpload} onUpload={onUpload} onDownload={onDownload} onRemoveDoc={handleRemove} />
      </div>
    </div>
  )
}
