import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  sort_order: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '', sort_order: 0 });

  const fetchDepartments = async () => {
    try {
      const data = await api.get<Department[]>('/api/admin/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/api/admin/departments/${editingDept.id}`, formData);
      } else {
        await api.post('/api/admin/departments', formData);
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Failed to save department:', error);
      alert('Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This may break associated timetables.')) return;
    try {
      await api.delete(`/api/admin/departments/${id}`);
      fetchDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department');
    }
  };

  const openModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ id: dept.id, name: dept.name, sort_order: dept.sort_order });
    } else {
      setEditingDept(null);
      setFormData({ id: '', name: '', sort_order: departments.length });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p>Manage college departments and their sort order.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Add Department
        </button>
      </div>

      <div className="data-table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Sort Order</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr><td colSpan={4} className="empty-state">No departments found</td></tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id}>
                  <td><code>{dept.id}</code></td>
                  <td>{dept.name}</td>
                  <td>{dept.sort_order}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => openModal(dept)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(dept.id)} title="Delete">
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
        title={editingDept ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-group">
            <label className="form-label">ID (Unique Identifier)</label>
            <input className="form-input" type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              disabled={!!editingDept}
              required
              placeholder="e.g., bcom_ca"
            />
            {!editingDept && <small>Must be unique and alphanumeric (no spaces).</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., B.Com CA"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sort Order</label>
            <input className="form-input" type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Department</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
