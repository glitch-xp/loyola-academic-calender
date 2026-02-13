import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MasterConfig, DayOrderConfig, TimeTable } from '../types';

const KEYS = {
    USER_PROFILE: 'user_profile',
    MASTER_CONFIG: 'master_config',
    DAY_ORDER_CONFIG: 'day_order_config',
    TIMETABLE: 'timetable',
    LAST_FETCH: 'last_fetch_timestamp',
};

export const StorageService = {
    // User Profile
    async getUserProfile(): Promise<UserProfile | null> {
        const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
        return data ? JSON.parse(data) : null;
    },

    async saveUserProfile(profile: UserProfile): Promise<void> {
        await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    },

    async clearUser(): Promise<void> {
        await AsyncStorage.removeItem(KEYS.USER_PROFILE);
        await AsyncStorage.removeItem(KEYS.DAY_ORDER_CONFIG);
        await AsyncStorage.removeItem(KEYS.TIMETABLE);
    },

    // Cached Data
    async saveData(key: string, data: any): Promise<void> {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    },

    async getData<T>(key: string): Promise<T | null> {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    async removeData(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    },

    KEYS // Export keys for direct access if needed
};
