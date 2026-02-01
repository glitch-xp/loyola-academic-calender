import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { StorageService } from '../../services/StorageService';
import { DayOrderConfig, TimeTable, MasterConfig, UserProfile } from '../../types';
import { DayOrderHelper } from '../../utils/DayOrderHelper';
import { TimetableHelper, SubjectWithTiming } from '../../utils/TimetableHelper';
import { Card } from '../../components/Card';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { ErrorScreen } from '../../components/ErrorScreen';
import { router } from 'expo-router';

export default function CalendarScreen() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarConfig, setCalendarConfig] = useState<DayOrderConfig | null>(null);
    const [timetable, setTimetable] = useState<TimeTable | null>(null);
    const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const cal = await StorageService.getData<DayOrderConfig>('day_order_config');
            const tt = await StorageService.getData<TimeTable>('timetable');
            const mc = await StorageService.getData<MasterConfig>('master_config');
            const profile = await StorageService.getUserProfile();

            // Check if critical data is missing
            if (!cal || !profile) {
                setError('Calendar data is missing. Please reconfigure your settings.');
                setLoading(false);
                return;
            }

            setCalendarConfig(cal);
            setTimetable(tt);
            setMasterConfig(mc);
            setUserProfile(profile);
        } catch (e) {
            console.error(e);
            setError('Failed to load calendar data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    // Pad start of month
    const startDay = days[0].getDay(); // 0 is Sun
    const padding = Array(startDay).fill(null);

    const handleDayPress = (date: Date) => {
        setSelectedDate(date);
        setModalVisible(true);
    };

    const getDayInfo = (date: Date) => {
        if (!calendarConfig) return null;
        return DayOrderHelper.getDayConfig(date, calendarConfig);
    };

    const renderDay = (date: Date | null, index: number) => {
        if (!date) return <View key={`pad-${index}`} style={styles.dayCell} />;

        const dayInfo = getDayInfo(date);
        const isToday = isSameDay(date, new Date());

        let bgColor = 'transparent';
        let textColor = Colors.text;

        if (dayInfo) {
            if (dayInfo.isHoliday) {
                bgColor = Colors.dayOrder.holiday; // Soft Red
            } else if (dayInfo.dayOrder) {
                // @ts-ignore
                bgColor = Colors.dayOrder[dayInfo.dayOrder] || 'transparent'; // Use pastel color
            }
        }

        return (
            <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dayCell, isToday && styles.todayBorder]}
                onPress={() => handleDayPress(date)}
            >
                <View style={[styles.dayCircle, { backgroundColor: bgColor }]}>
                    <Text style={[styles.dayText, { color: textColor }]}>{date.getDate()}</Text>
                </View>
                {dayInfo?.dayOrder && (
                    <Text style={styles.tinyLabel}>D - {dayInfo.dayOrder}</Text>
                )}
                {dayInfo?.isHoliday && (
                    <View style={styles.dot} />
                )}
            </TouchableOpacity>
        );
    };

    // Show loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    // Show error screen if data is missing or error occurred
    if (error) {
        return (
            <ErrorScreen
                title="Calendar Error"
                message={error}
                onRetry={error.includes('missing') ? () => router.replace('/welcome') : loadData}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft color={Colors.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight color={Colors.text} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.weekText}>{d}</Text>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                <View style={styles.calendarGrid}>
                    {padding.map((_, i) => renderDay(null, i))}
                    {days.map((d, i) => renderDay(d, i))}
                </View>
            </ScrollView>

            {/* Details Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : ''}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X color={Colors.textLight} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {selectedDate && (() => {
                                const info = getDayInfo(selectedDate);
                                if (!info) return <Text style={{ padding: 20 }}>No data available</Text>;

                                if (info.isHoliday) {
                                    return (
                                        <View style={styles.modalBody}>
                                            <Text style={styles.holidayTitle}>{info.event || 'Holiday'}</Text>
                                            <Text style={styles.relaxText}>No classes today.</Text>
                                        </View>
                                    );
                                }

                                if (info.dayOrder && timetable && userProfile) {
                                    const rawClasses = timetable[info.dayOrder] || [];
                                    const classes = TimetableHelper.enrichSubjectsWithTiming(
                                        rawClasses,
                                        userProfile.shift,
                                        masterConfig
                                    );
                                    return (
                                        <View style={styles.modalBody}>
                                            <Text style={styles.orderTitle}>Day Order {info.dayOrder}</Text>
                                            {classes.map((cls, idx) => (
                                                <View key={idx} style={styles.classRow}>
                                                    <Text style={styles.classTime}>{cls.startTime}</Text>
                                                    <View style={styles.classDetails}>
                                                        <Text style={styles.className}>{cls.name}</Text>
                                                        <Text style={styles.classCode}>{cls.code}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                }

                                return <Text style={{ padding: 20 }}>No classes scheduled.</Text>;
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    weekText: {
        width: 40,
        textAlign: 'center',
        color: Colors.textLight,
        fontWeight: '600',
    },
    grid: {
        paddingHorizontal: 10,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 1/7
        aspectRatio: 0.8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayBorder: {
        borderWidth: 1,
        borderColor: Colors.primaryDark,
        borderRadius: 8,
    },
    dayText: {
        fontSize: 16,
        fontWeight: '500',
    },
    tinyLabel: {
        fontSize: 10,
        color: Colors.textLight,
        marginTop: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.error,
        marginTop: 2,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: '50%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
    },
    modalBody: {
        paddingBottom: 40,
    },
    holidayTitle: {
        fontSize: 24,
        color: Colors.dayOrder.holiday, // Use direct color or map if possible? Error is closest to holiday red
        fontWeight: 'bold',
        marginBottom: 10,
    },
    relaxText: {
        fontSize: 16,
        color: Colors.textLight,
    },
    orderTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.primaryDark,
        marginBottom: 16,
    },
    classRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center',
    },
    classTime: {
        width: 60,
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.textLight,
    },
    classDetails: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    classCode: {
        fontSize: 12,
        color: Colors.textLight,
    }

});
