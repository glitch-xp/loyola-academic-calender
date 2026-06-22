import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Save, AlertCircle, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';

interface TimetableInfo {
  id: string;
  department_id: string;
  department_name: string;
  year: string;
  shift_id: string | null;
  section: string | null;
}

interface TimetableEntry {
  day_order: number;
  period: number;
  subject_name: string;
  subject_code: string;
  teacher: string;
}

export default function TimetableEditor() {
  const [timetables, setTimetables] = useState<TimetableInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDeptId, setEditDeptId] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editShiftId, setEditShiftId] = useState('');
  const [editSection, setEditSection] = useState('');
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // 6 day orders x 5 periods
  const days = [1, 2, 3, 4, 5, 6];
  const periods = [1, 2, 3, 4, 5];

  useEffect(() => {
    const fetchTimetables = async () => {
      try {
        const data = await api.get<TimetableInfo[]>('/api/admin/timetables');
        setTimetables(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch timetables list', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetables();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const fetchEntries = async () => {
      setMessage(null);
      try {
        const data = await api.get<any[]>(`/api/admin/timetable-entries/${selectedId}`);
        // Transform the list into a structured array
        const structured: TimetableEntry[] = [];
        
        // Initialize all 30 cells (6x5)
        for (let d of days) {
          for (let p of periods) {
            const existing = data.find(e => e.day_order === d && e.period === p);
            structured.push({
              day_order: d,
              period: p,
              subject_name: existing?.subject_name || '',
              subject_code: existing?.subject_code || '',
              teacher: existing?.teacher || ''
            });
          }
        }
        setEntries(structured);
      } catch (error) {
        console.error('Failed to fetch entries', error);
      }
    };
    fetchEntries();
  }, [selectedId]);

  const handleCellChange = (day: number, period: number, field: keyof TimetableEntry, value: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.day_order === day && entry.period === period) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const getEntry = (day: number, period: number) => {
    return entries.find(e => e.day_order === day && e.period === period);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMessage(null);
    try {
      // Filter out completely empty entries to save DB space
      const validEntries = entries.filter(e => 
        e.subject_name.trim() !== '' || e.subject_code.trim() !== ''
      );
      
      await api.post(`/api/admin/timetable-entries/bulk/${selectedId}`, { entries: validEntries });
      setMessage({ type: 'success', text: 'Timetable saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save timetable' });
    } finally {
      setSaving(false);
    }
  };

  const openEditMeta = () => {
    const tt = timetables.find(t => t.id === selectedId);
    if (!tt) return;
    setEditDeptId(tt.department_id || '');
    setEditYear(tt.year || '');
    setEditShiftId(tt.shift_id || '');
    setEditSection(tt.section || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateMeta = async () => {
    if (!selectedId) return;
    setUpdatingMeta(true);
    try {
      await api.put(`/api/admin/timetables/${selectedId}`, {
        department_id: editDeptId,
        year: editYear,
        shift_id: editShiftId || null,
        section: editSection || null
      });
      setMessage({ type: 'success', text: 'Timetable details updated!' });
      setIsEditModalOpen(false);
      // Refresh timetables list
      const data = await api.get<TimetableInfo[]>('/api/admin/timetables');
      setTimetables(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update details' });
    } finally {
      setUpdatingMeta(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page-container timetable-editor-page">
      <div className="page-header">
        <div>
          <h1>Timetable Editor</h1>
          <p>Edit class schedules for each day order.</p>
        </div>
        <div className="header-actions">
          <select className="form-select input-select" 
            value={selectedId} 
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {timetables.map(tt => (
              <option key={tt.id} value={tt.id}>
                {tt.department_name || tt.department_id} - Year {tt.year} {tt.shift_id ? `(Shift ${tt.shift_id})` : ''} {tt.section ? `[${tt.section}]` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-icon" onClick={openEditMeta} disabled={!selectedId} title="Edit Details">
            <Edit2 size={18} />
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving || !selectedId}
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <AlertCircle size={18} /> {message.text}
        </div>
      )}

      {selectedId && entries.length > 0 && (
        <div className="timetable-grid-container card">
          <div className="timetable-grid">
            {/* Header row */}
            <div className="tt-header-cell empty"></div>
            {periods.map(p => (
              <div key={`p-${p}`} className="tt-header-cell">Period {p}</div>
            ))}

            {/* Grid rows */}
            {days.map(day => (
              <React.Fragment key={`day-${day}`}>
                <div className="tt-row-header">Day {day}</div>
                {periods.map(period => {
                  const entry = getEntry(day, period);
                  return (
                    <div key={`cell-${day}-${period}`} className="tt-cell">
                      <input type="text" 
                        placeholder="Subject Name" 
                        className="form-input cell-input subject-name"
                        value={entry?.subject_name || ''}
                        onChange={(e) => handleCellChange(day, period, 'subject_name', e.target.value)}
                      />
                      <input type="text" 
                        placeholder="Code" 
                        className="form-input cell-input subject-code"
                        value={entry?.subject_code || ''}
                        onChange={(e) => handleCellChange(day, period, 'subject_code', e.target.value)}
                      />
                      <div className="cell-bottom-row">
                        <input type="text" 
                          placeholder="Teacher" 
                          className="form-input cell-input teacher"
                          value={entry?.teacher || ''}
                          onChange={(e) => handleCellChange(day, period, 'teacher', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Timetable Details"
      >
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Department ID</label>
          <input className="form-input" value={editDeptId} onChange={e => setEditDeptId(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Year (I, II, III)</label>
          <input className="form-input" value={editYear} onChange={e => setEditYear(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Shift (optional)</label>
          <input className="form-input" value={editShiftId} onChange={e => setEditShiftId(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Section (optional)</label>
          <input className="form-input" value={editSection} onChange={e => setEditSection(e.target.value)} />
        </div>
        <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdateMeta} disabled={updatingMeta}>
            {updatingMeta ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
