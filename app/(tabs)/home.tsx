import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { DayOrderHelper } from '../../utils/DayOrderHelper';
import { StorageService } from '../../services/StorageService';
import { Card } from '../../components/Card';
import { Subject, TimeTable, DayOrderConfig } from '../../types';

export default function HomeScreen() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<TimeTable | null>(null);
    const [calendar, setCalendar] = useState<DayOrderConfig | null>(null);
    const [todayConfig, setTodayConfig] = useState<{ dayOrder: number | null, isHoliday: boolean, event?: string } | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [nextEvent, setNextEvent] = useState<{ name: string, date: string, daysLeft: number } | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = async () => {
        setLoading(true);
        try {
            const storedTimetable = await StorageService.getData<TimeTable>('timetable');
            const storedCalendar = await StorageService.getData<DayOrderConfig>('day_order_config');

            if (storedTimetable) setTimetable(storedTimetable);
            if (storedCalendar) setCalendar(storedCalendar);

            calculateDay(storedTimetable, storedCalendar);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateDay = (tt: TimeTable | null, cal: DayOrderConfig | null) => {
        const today = new Date();
        // For demo purposes, let's fix the date or use real
        // today.setDate(2); // Uncomment to test specific logic 

        setCurrentDate(today);

        if (cal) {
            const todayConf = DayOrderHelper.getDayConfig(today, cal);
            setTodayConfig(todayConf);

            if (todayConf && todayConf.dayOrder && tt) {
                setSubjects(tt[todayConf.dayOrder] || []);
            } else {
                setSubjects([]);
            }

            setNextEvent(DayOrderHelper.getNextEvent(cal));
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getDayOrderColor = (order: number | null) => {
        if (!order) return Colors.dayOrder.holiday;
        // @ts-ignore
        return Colors.dayOrder[order] || Colors.primary;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>{DayOrderHelper.getGreeting(currentDate)}</Text>
                    <Text style={styles.date}>{DayOrderHelper.formatDate(currentDate)}</Text>
                </View>

                {/* Day Order Card */}
                <Card style={{ backgroundColor: getDayOrderColor(todayConfig?.dayOrder || null) }}>
                    <View style={styles.dayOrderContainer}>
                        <View>
                            <Text style={styles.dayLabel}>
                                {todayConfig?.isHoliday ? 'Holiday' : 'Day Order'}
                            </Text>
                            <Text style={styles.dayValue}>
                                {todayConfig?.isHoliday ? (todayConfig?.event || 'No Classes') : todayConfig?.dayOrder || '-'}
                            </Text>
                        </View>
                        {!todayConfig?.isHoliday && (
                            <View style={styles.totalClasses}>
                                <Text style={styles.classCount}>{subjects.length}</Text>
                                <Text style={styles.classLabel}>Classes</Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Next Event Countdown */}
                {nextEvent && (
                    <Card style={styles.eventCard}>
                        <View style={styles.eventRow}>
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventLabel}>UPCOMING EVENT</Text>
                                <Text style={styles.eventName}>{nextEvent.name}</Text>
                                <Text style={styles.eventDate}>{new Date(nextEvent.date).toDateString()}</Text>
                            </View>
                            <View style={styles.countdown}>
                                <Text style={styles.daysLeft}>{nextEvent.daysLeft}</Text>
                                <Text style={styles.daysLabel}>Days</Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* Timetable List */}
                {!todayConfig?.isHoliday && subjects.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        {subjects.map((sub, index) => (
                            <Card key={index} style={styles.subjectCard}>
                                <View style={styles.timeContainer}>
                                    <Text style={styles.time}>{sub.startTime}</Text>
                                    <Text style={styles.timeEnd}>{sub.endTime}</Text>
                                </View>
                                <View style={styles.subjectInfo}>
                                    <Text style={styles.subjectName}>{sub.name}</Text>
                                    <Text style={styles.subjectCode}>{sub.code}</Text>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}

                {todayConfig?.isHoliday && (
                    <View style={styles.holidayContainer}>
                        <Text style={styles.holidayText}>Enjoy your day off!</Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    date: {
        fontSize: 16,
        color: Colors.textLight,
        marginTop: 4,
    },
    dayOrderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayLabel: {
        fontSize: 14,
        color: Colors.textLight, // Darker for contrast on pastel
        fontWeight: '600',
        opacity: 0.8,
        textTransform: 'uppercase',
    },
    dayValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 4,
    },
    totalClasses: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    classCount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    classLabel: {
        fontSize: 12,
        color: Colors.textLight,
    },
    // Event
    eventCard: {
        backgroundColor: Colors.secondary,
    },
    eventRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventInfo: {
        flex: 1,
    },
    eventLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textLight,
        letterSpacing: 1,
    },
    eventName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 2,
    },
    eventDate: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 2,
    },
    countdown: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 10,
        borderRadius: 12,
        minWidth: 60,
    },
    daysLeft: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    daysLabel: {
        fontSize: 10,
        color: Colors.textLight,
    },
    // Subjects
    section: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 12,
    },
    timeContainer: {
        paddingRight: 16,
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
        alignItems: 'center',
        minWidth: 70,
    },
    time: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    timeEnd: {
        fontSize: 12,
        color: Colors.textLight,
    },
    subjectInfo: {
        paddingLeft: 16,
        flex: 1,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    subjectCode: {
        fontSize: 14,
        color: Colors.textLight,
    },
    holidayContainer: {
        padding: 40,
        alignItems: 'center',
    },
    holidayText: {
        fontSize: 18,
        color: Colors.textLight,
        fontStyle: 'italic',
    }
});
