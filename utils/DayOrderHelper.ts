import { DayOrderConfig } from '../types';
import { differenceInDays, startOfDay } from 'date-fns';

export const DayOrderHelper = {
    /**
     * Get the configuration for a specific date from the calendar config.
     * If no explicit config exists, return default (e.g., could be weekend or just unknown).
     * Also normalizes dayOrder from string format "Day-1" to numeric 1.
      */
    getDayConfig(date: Date, calendar: DayOrderConfig) {
        // Format date as YYYY-MM-DD using local time (not UTC) to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const config = calendar[dateStr];

        if (!config) return null;

        // Parse dayOrder if it's a string like "Day-1" to extract the number
        let dayOrderValue: number | null = null;
        if (config.dayOrder) {
            if (typeof config.dayOrder === 'string') {
                // Extract number from "Day-1", "Day-2", etc.
                const match = config.dayOrder.match(/\d+/);
                if (match) {
                    dayOrderValue = parseInt(match[0], 10);
                }
            } else {
                dayOrderValue = config.dayOrder;
            }
        }

        return {
            ...config,
            dayOrder: dayOrderValue
        };
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
