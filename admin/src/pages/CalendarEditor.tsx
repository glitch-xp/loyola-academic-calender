import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarDay {
  date: string;
  day_order: number | null;
  is_holiday: boolean;
  event_title: string | null;
  event_description: string | null;
}

export default function CalendarEditor() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<CalendarDay | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchMonth = async () => {
    setLoading(true);
    try {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const data = await api.get<any[]>(`/api/admin/calendar?month=${monthStr}`);
      setDays(data.map(d => ({
        date: d.date,
        day_order: d.day_order,
        is_holiday: d.is_holiday === 1,
        event_title: d.event_title,
        event_description: d.event_description
      })));
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (dateStr: string) => {
    const existing = days.find(d => d.date === dateStr);
    setEditingDay(existing || {
      date: dateStr,
      day_order: null,
      is_holiday: false,
      event_title: null,
      event_description: null
    });
    setIsModalOpen(true);
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    try {
      await api.post('/api/admin/calendar', editingDay);
      setIsModalOpen(false);
      fetchMonth();
    } catch (error) {
      console.error('Failed to save day:', error);
      alert('Failed to save calendar day');
    }
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="calendar-grid glass-card">
        <div className="cal-header">Sun</div>
        <div className="cal-header">Mon</div>
        <div className="cal-header">Tue</div>
        <div className="cal-header">Wed</div>
        <div className="cal-header">Thu</div>
        <div className="cal-header">Fri</div>
        <div className="cal-header">Sat</div>

        {blanks.map(i => <div key={`blank-${i}`} className="cal-cell empty"></div>)}

        {monthDays.map(day => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayData = days.find(d => d.date === dateStr);
          const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6;

          return (
            <div 
              key={day} 
              className={`cal-cell ${dayData?.is_holiday || isWeekend ? 'holiday' : ''} ${dayData?.day_order ? 'has-order' : ''}`}
              onClick={() => handleDayClick(dateStr)}
            >
              <div className="cal-date-num">{day}</div>
              {dayData?.day_order && <div className="cal-badge order">Day {dayData.day_order}</div>}
              {dayData?.event_title && <div className="cal-badge event">{dayData.event_title}</div>}
              {(dayData?.is_holiday || (!dayData && isWeekend)) && !dayData?.event_title && (
                <div className="cal-badge event holiday-text">Holiday</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container calendar-page">
      <div className="page-header">
        <div>
          <h1>Calendar Editor</h1>
          <p>Set day orders, holidays, and events.</p>
        </div>
      </div>

      <div className="calendar-controls glass-card">
        <button className="btn-icon" onClick={handlePrevMonth}><ChevronLeft size={24} /></button>
        <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
        <button className="btn-icon" onClick={handleNextMonth}><ChevronRight size={24} /></button>
      </div>

      {loading ? <div className="page-loading">Loading...</div> : renderCalendarGrid()}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Edit: ${editingDay?.date}`}
      >
        {editingDay && (
          <form onSubmit={handleSaveDay} className="form-layout">
            <div className="form-group">
              <label>Day Order (1-6)</label>
              <select 
                value={editingDay.day_order || ''} 
                onChange={(e) => setEditingDay({...editingDay, day_order: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">None</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Day {n}</option>)}
              </select>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={editingDay.is_holiday}
                  onChange={(e) => setEditingDay({...editingDay, is_holiday: e.target.checked})}
                />
                Mark as Holiday
              </label>
            </div>

            <div className="form-group">
              <label>Event Title</label>
              <input 
                type="text" 
                value={editingDay.event_title || ''}
                onChange={(e) => setEditingDay({...editingDay, event_title: e.target.value})}
                placeholder="e.g., Semester Exams Begin"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Day</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
