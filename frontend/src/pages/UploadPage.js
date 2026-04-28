import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await uploadAPI.uploadFile(fd, setProgress);
      setResult(res);
      toast.success(`Imported ${res.stats.imported} records!`);
      setFile(null);
      loadRecords(1);
    } catch (err) {
      toast.error(err.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const loadRecords = async (p = 1) => {
    setRecordsLoading(true);
    try {
      const res = await uploadAPI.getRecords({ page: p, limit: 20 });
      setRecords(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
      setPage(p);
    } catch {}
    finally { setRecordsLoading(false); }
  };

  React.useEffect(() => { loadRecords(1); }, []);

  const sampleCSV = `crop,state,year,season,area,production,yield,rainfall,temperature,price
Rice,Punjab,2023,Kharif,150000,450000,3000,780,28,2100
Wheat,Haryana,2023,Rabi,120000,380000,3166,650,22,2015
Cotton,Maharashtra,2023,Kharif,90000,135000,1500,950,31,6200`;

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agriinsight_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          Smart <span className="gradient-text">Data Upload</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Upload CSV or Excel files — auto column detection and data cleaning included</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <div>
          {/* Dropzone */}
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? 'var(--accent-green)' : file ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '48px 32px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.25s', marginBottom: 20,
            background: isDragActive ? 'rgba(34,197,94,0.05)' : file ? 'rgba(34,197,94,0.03)' : 'var(--bg-card)',
          }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>{file ? '📄' : isDragActive ? '📥' : '☁️'}</div>
            {file ? (
              <>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent-green)', marginBottom: 4 }}>{file.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB — Ready to upload</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your dataset'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Supports CSV, XLSX, XLS up to 50MB</p>
              </>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Uploading & processing...</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>{progress}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading} style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              {uploading ? '⏳ Processing...' : '⊛ Upload & Import'}
            </button>
            {file && <button className="btn btn-secondary" onClick={() => setFile(null)}>✕ Clear</button>}
          </div>

          {/* Result */}
          {result && (
            <div className="card animate-fade-in" style={{ marginBottom: 24, borderColor: result.stats.errors > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>IMPORT RESULTS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Rows', value: result.stats.totalRows, color: 'var(--text-primary)' },
                  { label: 'Imported', value: result.stats.imported, color: '#22c55e' },
                  { label: 'Errors', value: result.stats.errors, color: result.stats.errors > 0 ? '#f59e0b' : '#22c55e' },
                  { label: 'Nulls Filled', value: result.stats.nullsFilled, color: '#3b82f6' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Detected columns */}
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>AUTO-DETECTED COLUMNS:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(result.stats.columnMap || {}).filter(([, v]) => v).map(([field, col]) => (
                    <span key={field} className="badge badge-green">{field} → {col}</span>
                  ))}
                </div>
              </div>

              {result.stats.errorDetails?.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: 12, color: 'var(--accent-amber)', cursor: 'pointer' }}>
                    ⚠ {result.stats.errors} row errors (click to view)
                  </summary>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    {result.stats.errorDetails.map((e, i) => (
                      <div key={i}>Row {e.row}: {e.reason}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Data table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>UPLOADED DATA RECORDS</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => loadRecords(page)}>↻ Refresh</button>
            </div>
            {recordsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 6 }} />)}
              </div>
            ) : records.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
                No data yet. Upload a file to get started.
              </p>
            ) : (
              <>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>Crop</th><th>State</th><th>Year</th><th>Season</th><th>Yield (kg/ha)</th><th>Rainfall (mm)</th><th>Price (₹/q)</th><th>Source</th></tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r._id}>
                          <td><strong>{r.crop}</strong></td>
                          <td>{r.state}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.year}</td>
                          <td><span className="badge badge-blue">{r.season}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>{r.yield?.toLocaleString()}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>{r.rainfall}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>₹{r.price?.toLocaleString()}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sourceFile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => loadRecords(page - 1)} disabled={page <= 1}>← Prev</button>
                    <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => loadRecords(page + 1)} disabled={page >= totalPages}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sample download */}
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📋 Sample Template</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Download our sample CSV to see the expected format.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={downloadSample}>
              ↓ Download Sample CSV
            </button>
          </div>

          {/* Supported columns */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🔍 Supported Columns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { field: 'crop', required: true, desc: 'Crop name' },
                { field: 'state', required: true, desc: 'State name' },
                { field: 'year', required: true, desc: 'Crop year (YYYY)' },
                { field: 'season', required: false, desc: 'Kharif/Rabi/Zaid' },
                { field: 'area', required: false, desc: 'Area in hectares' },
                { field: 'production', required: false, desc: 'In tonnes' },
                { field: 'yield', required: false, desc: 'kg/hectare (auto-calc)' },
                { field: 'rainfall', required: false, desc: 'Annual mm' },
                { field: 'temperature', required: false, desc: 'Avg °C' },
                { field: 'price', required: false, desc: '₹ per quintal' },
                { field: 'fertilizer', required: false, desc: 'kg/hectare' },
                { field: 'pesticide', required: false, desc: 'kg/hectare' },
              ].map(c => (
                <div key={c.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(30,58,95,0.3)' }}>
                  <div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{c.field}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{c.desc}</span>
                  </div>
                  <span className={`badge ${c.required ? 'badge-red' : 'badge-blue'}`}>{c.required ? 'req' : 'opt'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data cleaning info */}
          <div className="card" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⚡ Auto Data Cleaning</h3>
            {[
              '✓ Auto column name detection',
              '✓ Missing value imputation',
              '✓ Yield auto-calculation from area/production',
              '✓ Duplicate row detection & removal',
              '✓ Invalid type correction',
              '✓ Whitespace & case normalization',
            ].map(f => (
              <p key={f} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{f}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
