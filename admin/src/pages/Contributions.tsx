import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Check, X, Eye, Trash2, Clock, CheckCircle, XCircle, Inbox, AlertCircle } from 'lucide-react';

interface Contribution {
  id: number;
  department_id: string;
  department_name: string;
  year: string;
  shift_id: string | null;
  section: string | null;
  contributor_name: string | null;
  timetable_data: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  submitted_ip: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface TimetableEntry {
  name: string;
  code: string;
  room?: string;
  teacher?: string;
}

type TimetableData = Record<string, TimetableEntry[]>;

interface ContributionDetail {
  contribution: Contribution;
  existingTimetable: {
    id: string;
    data: TimetableData;
  } | null;
}

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: <Clock size={16} /> },
  { key: 'approved', label: 'Approved', icon: <CheckCircle size={16} /> },
  { key: 'rejected', label: 'Rejected', icon: <XCircle size={16} /> },
  { key: 'all', label: 'All', icon: <Inbox size={16} /> },
];

export default function Contributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<ContributionDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const endpoint = statusFilter === 'all'
        ? '/api/admin/contributions'
        : `/api/admin/contributions?status=${statusFilter}`;
      const data = await api.get<Contribution[]>(endpoint);
      setContributions(data);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [statusFilter]);

  const openReview = async (id: number) => {
    setReviewLoading(true);
    setRejectNotes('');
    try {
      const detail = await api.get<ContributionDetail>(`/api/admin/contributions/${id}`);
      setReviewModal(detail);
    } catch (error) {
      console.error('Failed to load contribution:', error);
      showMessage('error', 'Failed to load contribution details');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/contributions/${reviewModal.contribution.id}/approve`, {});
      showMessage('success', 'Contribution approved and timetable created!');
      setReviewModal(null);
      fetchContributions();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/contributions/${reviewModal.contribution.id}/reject`, {
        notes: rejectNotes
      });
      showMessage('success', 'Contribution rejected');
      setReviewModal(null);
      fetchContributions();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this contribution?')) return;
    try {
      await api.delete(`/api/admin/contributions/${id}`);
      showMessage('success', 'Contribution deleted');
      fetchContributions();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to delete');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getSlotLabel = (c: Contribution) => {
    let label = `${c.department_name || c.department_id} — Year ${c.year}`;
    if (c.shift_id) label += ` (Shift ${c.shift_id})`;
    if (c.section) label += ` [${c.section}]`;
    return label;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="badge orange">Pending</span>;
      case 'approved': return <span className="badge green">Approved</span>;
      case 'rejected': return <span className="badge red">Rejected</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const pendingCount = contributions.filter(c => c.status === 'pending').length;

  // Parse timetable data for the preview grid
  const parseTimetable = (jsonStr: string): TimetableData => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  };

  const days = [1, 2, 3, 4, 5, 6];

  const renderTimetableGrid = (data: TimetableData, label: string, isExisting = false) => {
    // Find max periods across all days
    const maxPeriods = Math.max(
      ...days.map(d => (data[String(d)] || []).length),
      1
    );
    const periods = Array.from({ length: maxPeriods }, (_, i) => i + 1);

    return (
      <div className={`contribution-preview ${isExisting ? 'existing' : 'submitted'}`}>
        <h4 className="preview-label">{label}</h4>
        <div className="contribution-grid" style={{
          gridTemplateColumns: `auto repeat(${maxPeriods}, 1fr)`
        }}>
          {/* Header */}
          <div className="timetable-header" style={{ background: 'var(--bg-deep)' }}></div>
          {periods.map(p => (
            <div key={`h-${p}`} className="timetable-header">P{p}</div>
          ))}

          {/* Rows */}
          {days.map(day => (
            <>
              <div key={`rl-${day}`} className="timetable-row-label">Day {day}</div>
              {periods.map(period => {
                const entries = data[String(day)] || [];
                const entry = entries[period - 1];
                return (
                  <div key={`c-${day}-${period}`} className={`timetable-cell ${!entry?.name ? 'empty' : ''}`}>
                    {entry?.name && (
                      <>
                        <div className="subject-name">{entry.name}</div>
                        {entry.code && <div className="subject-code">{entry.code}</div>}
                        {(entry.room || entry.teacher) && (
                          <div className="cell-meta">
                            {entry.room}{entry.room && entry.teacher ? ' · ' : ''}{entry.teacher}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  };

  if (loading && contributions.length === 0) {
    return <div className="page-loader"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Contributions</h2>
            <p>Review student-submitted timetables before publishing.</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="contrib-tabs">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            className={`contrib-tab ${statusFilter === tab.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.key === 'pending' && pendingCount > 0 && statusFilter !== 'pending' && (
              <span className="tab-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`toast ${message.type}`} style={{ marginBottom: 16 }}>
          <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {message.text}
        </div>
      )}

      {/* Table */}
      {contributions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No {statusFilter === 'all' ? '' : statusFilter} contributions</h3>
          <p>
            {statusFilter === 'pending'
              ? 'No timetables are waiting for review.'
              : 'No contributions match this filter.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper card">
          <table className="table">
            <thead>
              <tr>
                <th>Department / Slot</th>
                <th>Contributor</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map(c => (
                <tr key={c.id}>
                  <td className="primary">{getSlotLabel(c)}</td>
                  <td>{c.contributor_name || <span className="text-muted">Anonymous</span>}</td>
                  <td>{getStatusBadge(c.status)}</td>
                  <td className="text-muted">{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-ghost btn-icon sm"
                        onClick={() => openReview(c.id)}
                        title="Review"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon sm"
                        onClick={() => handleDelete(c.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title="Review Contribution"
      >
        {reviewLoading && <div className="loader"><div className="spinner"></div></div>}
        {reviewModal && (
          <div className="contribution-review">
            {/* Submission Info */}
            <div className="review-info-grid">
              <div className="review-info-item">
                <span className="review-info-label">Department</span>
                <span className="review-info-value">
                  {reviewModal.contribution.department_name || reviewModal.contribution.department_id}
                </span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Year</span>
                <span className="review-info-value">{reviewModal.contribution.year}</span>
              </div>
              {reviewModal.contribution.shift_id && (
                <div className="review-info-item">
                  <span className="review-info-label">Shift</span>
                  <span className="review-info-value">{reviewModal.contribution.shift_id}</span>
                </div>
              )}
              {reviewModal.contribution.section && (
                <div className="review-info-item">
                  <span className="review-info-label">Section</span>
                  <span className="review-info-value">{reviewModal.contribution.section}</span>
                </div>
              )}
              <div className="review-info-item">
                <span className="review-info-label">Contributor</span>
                <span className="review-info-value">
                  {reviewModal.contribution.contributor_name || 'Anonymous'}
                </span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Submitted</span>
                <span className="review-info-value">
                  {formatDate(reviewModal.contribution.created_at)}
                </span>
              </div>
            </div>

            {/* Status badge for already-reviewed contributions */}
            {reviewModal.contribution.status !== 'pending' && (
              <div className="review-status-banner" data-status={reviewModal.contribution.status}>
                {reviewModal.contribution.status === 'approved' ? (
                  <><CheckCircle size={16} /> This contribution has been approved</>
                ) : (
                  <><XCircle size={16} /> This contribution was rejected</>
                )}
                {reviewModal.contribution.admin_notes && (
                  <div className="review-admin-note">Note: {reviewModal.contribution.admin_notes}</div>
                )}
              </div>
            )}

            {/* Timetable Previews */}
            <div className="review-previews">
              {renderTimetableGrid(
                parseTimetable(reviewModal.contribution.timetable_data),
                '📝 Submitted Timetable'
              )}

              {reviewModal.existingTimetable && (
                renderTimetableGrid(
                  reviewModal.existingTimetable.data,
                  '📋 Current Timetable (will be replaced)',
                  true
                )
              )}
            </div>

            {/* Actions (only for pending) */}
            {reviewModal.contribution.status === 'pending' && (
              <div className="review-actions">
                <div className="reject-section">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rejection reason (optional)"
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                  />
                </div>
                <div className="review-buttons">
                  <button
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    <X size={16} />
                    {actionLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    <Check size={16} />
                    {actionLoading ? 'Approving...' : 'Approve & Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
