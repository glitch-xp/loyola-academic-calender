import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';

interface Release {
  id: number;
  version: string;
  platform: string;
  release_notes: string;
  download_url: string;
  is_latest: number;
  created_at: string;
}

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  
  const initialForm = { version: '', platform: 'android', release_notes: '', download_url: '', is_latest: 1 };
  const [formData, setFormData] = useState(initialForm);

  const fetchReleases = async () => {
    try {
      const data = await api.get<Release[]>('/api/admin/releases');
      setReleases(data);
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRelease) {
        await api.put(`/api/admin/releases/${editingRelease.id}`, formData);
      } else {
        await api.post('/api/admin/releases', formData);
      }
      setIsModalOpen(false);
      fetchReleases();
    } catch (error) {
      console.error('Failed to save release:', error);
      alert('Failed to save release');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this release?')) return;
    try {
      await api.delete(`/api/admin/releases/${id}`);
      fetchReleases();
    } catch (error) {
      console.error('Failed to delete release:', error);
      alert('Failed to delete release');
    }
  };

  const openModal = (release?: Release) => {
    if (release) {
      setEditingRelease(release);
      setFormData({
        version: release.version,
        platform: release.platform,
        release_notes: release.release_notes || '',
        download_url: release.download_url || '',
        is_latest: release.is_latest
      });
    } else {
      setEditingRelease(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>App Releases</h1>
          <p>Manage over-the-air updates and APK downloads.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> New Release
        </button>
      </div>

      <div className="data-table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Notes</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr><td colSpan={5} className="empty-state">No releases found</td></tr>
            ) : (
              releases.map((release) => (
                <tr key={release.id}>
                  <td><strong>v{release.version}</strong></td>
                  <td className="capitalize">{release.platform}</td>
                  <td>
                    {release.is_latest === 1 ? (
                      <span className="badge badge-success"><CheckCircle size={12}/> Latest</span>
                    ) : (
                      <span className="badge badge-secondary">Archived</span>
                    )}
                  </td>
                  <td className="truncate-cell">{release.release_notes}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => openModal(release)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(release.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRelease ? 'Edit Release' : 'New Release'}
      >
        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-row">
            <div className="form-group half">
              <label>Version (e.g. 1.0.5)</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                required
              />
            </div>
            <div className="form-group half">
              <label>Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              >
                <option value="android">Android (APK)</option>
                <option value="web">Web (PWA)</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Download URL (for APK)</label>
            <input
              type="url"
              value={formData.download_url}
              onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              placeholder="https://github.com/.../releases/download/v1.0.5/app.apk"
            />
          </div>

          <div className="form-group">
            <label>Release Notes</label>
            <textarea
              value={formData.release_notes}
              onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
              rows={4}
              placeholder="What's new in this version?"
            ></textarea>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={formData.is_latest === 1}
                onChange={(e) => setFormData({ ...formData, is_latest: e.target.checked ? 1 : 0 })}
              />
              Mark as Latest Release (Active Update)
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Release</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
