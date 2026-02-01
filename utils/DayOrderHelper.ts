import { DayOrderConfig } from '../types';
import { differenceInDays, startOfDay } from 'date-fns';

export const DayOrderHelper = {
    /**
     * Get the configuration for a specific date from the calendar config.
     * If no explicit config exists, return default (e.g., could be weekend or just unknown).
      */
    getDayConfig(date: Date, calendar: DayOrderConfig) {
        const dateStr = date.toISOString().split('T')[0];
        return calendar[dateStr] || null;
    },

    /**
     * Get formatted date string (e.g., "Monday, Feb 14")
     */
    formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Returns a greeting based on time of day
     */
    getGreeting(date: Date): string {
        const hours = date.getHours();
        if (hours < 12) return 'Good Morning';
        if (hours < 17) return 'Good Afternoon';
        return 'Good Evening';
    },

    /**
     * Find the next major event in the calendar
     */
    getNextEvent(calendar: DayOrderConfig): { name: string, date: string, daysLeft: number } | null {
        const today = startOfDay(new Date());
        const sortedDates = Object.keys(calendar).sort();

        for (const dateStr of sortedDates) {
            const entry = calendar[dateStr];
            if (entry.event && new Date(dateStr) >= today) {
                const daysLeft = differenceInDays(new Date(dateStr), today);
                return {
                    name: entry.event,
                    date: dateStr,
                    daysLeft
                };
            }
        }
        return null;
    }
};
