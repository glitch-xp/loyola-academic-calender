import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { DayOrderHelper } from '@/utils/DayOrderHelper';
import { TimetableHelper, SubjectWithTiming } from '@/utils/TimetableHelper';
import { StorageService } from '@/services/StorageService';
import { Card } from '@/components/Card';
import { Subject, TimeTable, DayOrderConfig, MasterConfig, UserProfile } from '@/types';
import { ErrorScreen } from '@/components/ErrorScreen';
import { router } from 'expo-router';
import { LiquidBackground } from '@/components/LiquidBackground';

interface NextClassInfo {
    current: SubjectWithTiming | null;
    next: SubjectWithTiming | null;
    status: 'before' | 'during' | 'between' | 'after';
    minutesUntilNext: number;
}

export default function HomeScreen() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<TimeTable | null>(null);
    const [calendar, setCalendar] = useState<DayOrderConfig | null>(null);
    const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [todayConfig, setTodayConfig] = useState<{ dayOrder: number | null, isHoliday: boolean, event?: string } | null>(null);
    const [subjects, setSubjects] = useState<SubjectWithTiming[]>([]);
    const [nextEvent, setNextEvent] = useState<{ name: string, date: string, daysLeft: number, isHoliday: boolean } | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [error, setError] = useState<string | null>(null);
    const [nextClassInfo, setNextClassInfo] = useState<NextClassInfo | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const storedTimetable = await StorageService.getData<TimeTable>('timetable');
            const storedCalendar = await StorageService.getData<DayOrderConfig>('day_order_config');
            const storedMasterConfig = await StorageService.getData<MasterConfig>('master_config');
            const storedUserProfile = await StorageService.getUserProfile();

            // Check if critical data is missing
            if (!storedTimetable || !storedCalendar || !storedUserProfile) {
                setError('Data is missing. Please reconfigure your settings.');
                setLoading(false);
                return;
            }

            if (storedTimetable) setTimetable(storedTimetable);
            if (storedCalendar) setCalendar(storedCalendar);
            if (storedMasterConfig) setMasterConfig(storedMasterConfig);
            if (storedUserProfile) setUserProfile(storedUserProfile);

            calculateDay(storedTimetable, storedCalendar, storedMasterConfig, storedUserProfile);
        } catch (e) {
            console.error(e);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const calculateDay = (
        tt: TimeTable | null,
        cal: DayOrderConfig | null,
        mc: MasterConfig | null,
        profile: UserProfile | null
    ) => {
        const today = new Date();
        // For demo purposes, let's fix the date or use real
        // today.setDate(2); // Uncomment to test specific logic 

        setCurrentDate(today);

        if (cal) {
            const todayConf = DayOrderHelper.getDayConfig(today, cal);
            setTodayConfig(todayConf);

            if (todayConf && todayConf.dayOrder && tt && profile) {
                const rawSubjects = tt[todayConf.dayOrder] || [];
                const enrichedSubjects = TimetableHelper.enrichSubjectsWithTiming(
                    rawSubjects,
                    profile.shift,
                    mc
                );
                setSubjects(enrichedSubjects);

                // Calculate next class info
                const nextInfo = calculateNextClass(enrichedSubjects, today);
                setNextClassInfo(nextInfo);
            } else {
                setSubjects([]);
                setNextClassInfo(null);
            }

            setNextEvent(DayOrderHelper.getNextEvent(cal));
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Update current time every minute for live countdown
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentDate(now);

            // Recalculate next class info with current time
            if (subjects.length > 0 && !todayConfig?.isHoliday) {
                const nextInfo = calculateNextClass(subjects, now);
                setNextClassInfo(nextInfo);
            }
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [subjects, todayConfig]);

    // Helper function to calculate next class information
    const calculateNextClass = (enrichedSubjects: SubjectWithTiming[], currentTime: Date): NextClassInfo | null => {
        if (enrichedSubjects.length === 0) return null;

        const now = currentTime.getHours() * 60 + currentTime.getMinutes();

        // Parse time string (HH:MM) to minutes since midnight
        const parseTime = (timeStr: string): number => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        let currentClass: SubjectWithTiming | null = null;
        let nextClass: SubjectWithTiming | null = null;
        let status: 'before' | 'during' | 'between' | 'after' = 'before';
        let minutesUntilNext = 0;

        for (let i = 0; i < enrichedSubjects.length; i++) {
            const subject = enrichedSubjects[i];
            const startMinutes = parseTime(subject.startTime);
            const endMinutes = parseTime(subject.endTime);

            // Check if current time is during this class
            if (now >= startMinutes && now < endMinutes) {
                currentClass = subject;
                nextClass = i + 1 < enrichedSubjects.length ? enrichedSubjects[i + 1] : null;
                status = 'during';
                if (nextClass) {
                    minutesUntilNext = parseTime(nextClass.startTime) - now;
                }
                break;
            }

            // Check if this is the next upcoming class
            if (now < startMinutes) {
                nextClass = subject;
                status = i === 0 ? 'before' : 'between';
                minutesUntilNext = startMinutes - now;
                if (i > 0) {
                    currentClass = enrichedSubjects[i - 1];
                }
                break;
            }
        }

        // If we've gone through all classes and haven't found a current or next one
        if (!currentClass && !nextClass) {
            status = 'after';
            currentClass = enrichedSubjects[enrichedSubjects.length - 1];
        }

        return {
            current: currentClass,
            next: nextClass,
            status,
            minutesUntilNext
        };
    };

    const getDayOrderColor = (order: number | null) => {
        if (!order) return Colors.dayOrder.holiday;
        // @ts-ignore
        return Colors.dayOrder[order] || Colors.primary;
    };

    // Show error screen if data is missing or error occurred
    if (error && !loading) {
        return (
            <ErrorScreen
                title="Data Error"
                message={error}
                onRetry={error.includes('missing') ? () => router.replace('/welcome') : loadData}
            />
        );
    }

    return (
        <LiquidBackground>
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
                                {!todayConfig?.isHoliday && todayConfig?.event && (
                                    <Text style={styles.eventSubText}>
                                        {todayConfig.event}
                                    </Text>
                                )}
                            </View>
                            {!todayConfig?.isHoliday && (
                                <View style={styles.totalClasses}>
                                    <Text style={styles.classCount}>{subjects.length}</Text>
                                    <Text style={styles.classLabel}>Classes</Text>
                                </View>
                            )}
                        </View>
                    </Card>

                    {/* Next Class Card */}
                    {!todayConfig?.isHoliday && nextClassInfo && (
                        <Card style={styles.nextClassCard}>
                            <View style={styles.nextClassContainer}>
                                <View style={styles.nextClassHeader}>
                                    <Text style={styles.nextClassLabel}>
                                        {nextClassInfo.status === 'during' ? 'CURRENT CLASS' :
                                            nextClassInfo.status === 'before' ? 'FIRST CLASS TODAY' :
                                                nextClassInfo.status === 'between' ? 'NEXT CLASS' :
                                                    'CLASSES COMPLETED'}
                                    </Text>
                                </View>

                                {nextClassInfo.status === 'during' && nextClassInfo.current && (
                                    <View style={styles.classDetailsContainer}>
                                        <View style={styles.currentClassInfo}>
                                            <Text style={styles.nextClassName}>{nextClassInfo.current.name}</Text>
                                            <Text style={styles.nextClassCode}>{nextClassInfo.current.code}</Text>
                                            <Text style={styles.nextClassTime}>
                                                {nextClassInfo.current.startTime} - {nextClassInfo.current.endTime}
                                            </Text>
                                        </View>
                                        {nextClassInfo.next && (
                                            <View style={styles.upNextContainer}>
                                                <Text style={styles.upNextLabel}>Up Next</Text>
                                                <Text style={styles.upNextName}>{nextClassInfo.next.name}</Text>
                                                <Text style={styles.upNextTime}>
                                                    in {Math.floor(nextClassInfo.minutesUntilNext / 60)}h {nextClassInfo.minutesUntilNext % 60}m
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {(nextClassInfo.status === 'before' || nextClassInfo.status === 'between') && nextClassInfo.next && (
                                    <View style={styles.classDetailsContainer}>
                                        <View style={styles.nextClassMainInfo}>
                                            <Text style={styles.nextClassName}>{nextClassInfo.next.name}</Text>
                                            <Text style={styles.nextClassCode}>{nextClassInfo.next.code}</Text>
                                            <Text style={styles.nextClassTime}>
                                                {nextClassInfo.next.startTime} - {nextClassInfo.next.endTime}
                                            </Text>
                                        </View>
                                        <View style={styles.countdownBox}>
                                            <Text style={styles.countdownTime}>
                                                {Math.floor(nextClassInfo.minutesUntilNext / 60)}:{String(nextClassInfo.minutesUntilNext % 60).padStart(2, '0')}
                                            </Text>
                                            <Text style={styles.countdownLabel}>
                                                {nextClassInfo.minutesUntilNext < 60 ? 'minutes' : 'hours'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {nextClassInfo.status === 'after' && (
                                    <View style={styles.classDetailsContainer}>
                                        <View style={styles.nextClassMainInfo}>
                                            <Text style={styles.nextClassName}>All Classes Completed</Text>
                                            <Text style={styles.nextClassCode}>Great work today! 🎉</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Card>
                    )}

                    {/* Next Event Countdown */}
                    {nextEvent && (
                        <Card style={styles.eventCard}>
                            <View style={styles.eventRow}>
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventLabel}>UPCOMING {nextEvent.isHoliday ? 'HOLIDAY' : 'EVENT'}</Text>
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
                            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
                            {subjects.map((sub, index) => (
                                <Card key={index} style={styles.subjectCard}>
                                    <View style={styles.subjectCardContent}>
                                        <View style={styles.timeContainer}>
                                            <Text style={styles.time}>{sub.startTime}</Text>
                                            <Text style={styles.timeEnd}>{sub.endTime}</Text>
                                        </View>
                                        <View style={styles.subjectInfo}>
                                            <Text style={styles.subjectName}>{sub.name}</Text>
                                            <Text style={styles.subjectCode}>{sub.code}</Text>
                                        </View>
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
        </LiquidBackground >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100, // Added bottom padding to avoid overlap with floating elements
    },
    header: {
        marginBottom: 24,
    },
    greeting: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    date: {
        fontSize: 15,
        color: Colors.textLight,
        marginTop: 4,
        fontFamily: 'Poppins_500Medium',
    },
    dayOrderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayLabel: {
        fontSize: 13,
        color: Colors.textLight,
        fontFamily: 'Poppins_600SemiBold',
        opacity: 0.9,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dayValue: {
        fontSize: 34,
        fontFamily: 'Poppins_800ExtraBold',
        color: Colors.text,
        marginTop: 4,
    },
    totalClasses: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    classCount: {
        fontSize: 24,
        fontFamily: 'Poppins_800ExtraBold',
        color: Colors.text,
    },
    classLabel: {
        fontSize: 12,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
    },
    // Event
    eventCard: {
        backgroundColor: Colors.dayOrder[3], // Subtle Amber/Yellow
        marginTop: 16,
        borderRadius: 24,
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
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text, // Darker for better contrast on yellow
        opacity: 0.7,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    eventName: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        lineHeight: 24,
    },
    eventDate: {
        fontSize: 14,
        color: Colors.text, // Darker for better contrast on yellow
        marginTop: 4,
        fontFamily: 'Poppins_500Medium',
        opacity: 0.8,
    },
    countdown: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 12,
        borderRadius: 16,
        minWidth: 70,
        marginLeft: 16,
    },
    daysLeft: {
        fontSize: 24,
        fontFamily: 'Poppins_800ExtraBold',
        color: Colors.primaryDark,
    },
    daysLabel: {
        fontSize: 11,
        color: Colors.textLight,
        fontFamily: 'Poppins_600SemiBold',
        textTransform: 'uppercase',
    },
    // Subjects
    section: {
        marginTop: 28,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    subjectCard: {
        marginBottom: 14,
        width: '100%',
    },
    subjectCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeContainer: {
        paddingRight: 16,
        borderRightWidth: 2,
        borderRightColor: Colors.border,
        alignItems: 'center',
        width: 85,
        justifyContent: 'center',
    },
    time: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
    },
    timeEnd: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 2,
        fontFamily: 'Poppins_500Medium',
    },
    subjectInfo: {
        paddingLeft: 16,
        flex: 1,
        justifyContent: 'center',
    },
    subjectName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 2,
        lineHeight: 22,
    },
    subjectCode: {
        fontSize: 13,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
    },
    holidayContainer: {
        padding: 40,
        alignItems: 'center',
    },
    holidayText: {
        fontSize: 18,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
        fontStyle: 'italic',
    },
    // Next Class Card
    nextClassCard: {
        backgroundColor: Colors.surface,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        marginTop: 16,
    },
    nextClassContainer: {
        gap: 12,
    },
    nextClassHeader: {
        marginBottom: 4,
    },
    nextClassLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: Colors.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    classDetailsContainer: {
        gap: 16,
    },
    currentClassInfo: {
        flex: 1,
    },
    nextClassMainInfo: {
        flex: 1,
    },
    nextClassName: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginBottom: 4,
        lineHeight: 28,
    },
    nextClassCode: {
        fontSize: 14,
        color: Colors.textLight,
        marginBottom: 6,
        fontFamily: 'Poppins_500Medium',
    },
    nextClassTime: {
        fontSize: 15,
        color: Colors.textLight,
        fontFamily: 'Poppins_600SemiBold',
    },
    upNextContainer: {
        backgroundColor: Colors.background,
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.secondary,
        marginTop: 8,
    },
    upNextLabel: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    upNextName: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 2,
    },
    upNextTime: {
        fontSize: 13,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
    },
    countdownBox: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    countdownTime: {
        fontSize: 26,
        fontFamily: 'Poppins_700Bold',
        color: '#FFFFFF',
    },
    countdownLabel: {
        fontSize: 11,
        color: '#FFFFFF',
        opacity: 0.9,
        marginTop: 2,
        textTransform: 'uppercase',
        fontFamily: 'Poppins_600SemiBold',
    },
    afterClassesContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    afterClassesText: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 4,
    },
    afterClassesSubtext: {
        fontSize: 14,
        color: Colors.textLight,
        fontFamily: 'Poppins_400Regular',
    },
    eventSubText: {
        fontSize: 14,
        color: Colors.text,
        fontFamily: 'Poppins_600SemiBold',
        marginTop: 4,
        opacity: 0.8
    },
});
