import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { DayOrderHelper } from '@/utils/DayOrderHelper';
import { TimetableHelper, SubjectWithTiming } from '@/utils/TimetableHelper';
import { StorageService } from '@/services/StorageService';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Subject, TimeTable, DayOrderConfig, MasterConfig, UserProfile, AttendanceData } from '@/types';
import { ErrorScreen } from '@/components/ErrorScreen';
import { router } from 'expo-router';
import { LiquidBackground } from '@/components/LiquidBackground';
import { DataService } from '@/services/DataService';
import { AttendanceService, findSubjectAttendance, getAttendanceTheme } from '@/services/AttendanceService';

interface NextClassInfo {
    current: SubjectWithTiming | null;
    next: SubjectWithTiming | null;
    status: 'before' | 'during' | 'between' | 'after';
    minutesUntilNext: number;
}

let lastHomeSyncAt = 0;

function isHomeSyncDue(force: boolean): boolean {
    if (force) return true;
    return Date.now() - lastHomeSyncAt > 60000;
}

function markHomeSynced(): void {
    lastHomeSyncAt = Date.now();
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
    const [contributor, setContributor] = useState<string | null>(null);
    const [isCustom, setIsCustom] = useState(false);
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);

    const loadData = async (shouldSync = true) => {
        if (loading) setLoading(true); // show loading only for initial load or manual refresh
        setError(null);

        let currentTimetable: TimeTable | null = null;
        let currentCalendar: DayOrderConfig | null = null;
        let currentMasterConfig: MasterConfig | null = null;
        let currentUserProfile: UserProfile | null = null;

        try {
            // 1. Load from local storage (Fast)
            const customTT = await StorageService.getData<TimeTable>('custom_timetable');
            setIsCustom(!!customTT);
            currentTimetable = customTT || await StorageService.getData<TimeTable>('timetable');
            currentCalendar = await StorageService.getData<DayOrderConfig>('day_order_config');
            currentMasterConfig = await StorageService.getData<MasterConfig>('master_config');
            currentUserProfile = await StorageService.getUserProfile();
            const storedContributor = customTT ? null : await StorageService.getData<string>('contributor');
            const attCache = await AttendanceService.getCachedAttendance();
            setAttendanceData(attCache.data);

            // Check if critical data is missing
            if (!currentTimetable || !currentCalendar || !currentUserProfile) {
                // If missing locally, force sync
                if (!shouldSync) {
                    setError('Data is missing. Please reconfigure your settings.');
                    setLoading(false);
                    return;
                }
            } else {
                // Render immediately with cached data
                setTimetable(currentTimetable);
                setCalendar(currentCalendar);
                setMasterConfig(currentMasterConfig);
                setUserProfile(currentUserProfile);
                setContributor(storedContributor);
                calculateDay(currentTimetable, currentCalendar, currentMasterConfig, currentUserProfile);
            }

            // 2. Sync with Server (Background, throttled to once per 60s unless cache is empty)
            if (shouldSync && isHomeSyncDue(!currentTimetable) && currentUserProfile) {
                try {
                    const courseData = await DataService.fetchCourseData(
                        currentUserProfile.department,
                        currentUserProfile.year,
                        currentUserProfile.shift,
                        currentUserProfile.section
                    );
                    markHomeSynced();

                    // Check for custom timetable
                    const customTT = await StorageService.getData<TimeTable>('custom_timetable');
                    setIsCustom(!!customTT);

                    // Update State
                    setTimetable(customTT || courseData.timetable);
                    setCalendar(courseData.calendar);
                    setContributor(customTT ? null : (courseData.contributor || null));

                    // Update Cache
                    if (!customTT) {
                        await StorageService.saveData('timetable', courseData.timetable);
                        if (courseData.contributor) {
                            await StorageService.saveData('contributor', courseData.contributor);
                        } else {
                            await StorageService.removeData('contributor');
                        }
                    } else {
                        await StorageService.saveData('timetable', customTT);
                        await StorageService.removeData('contributor');
                    }
                    await StorageService.saveData('day_order_config', courseData.calendar);

                    // Re-calculate with fresh data
                    calculateDay(customTT || courseData.timetable, courseData.calendar, currentMasterConfig, currentUserProfile);
                } catch (e) {
                    console.log('Sync failed (offline or error), using cached data');
                    // We don't block the UI if sync fails, we just keep using cached data
                    // But if we had NO data to begin with, then we show error
                    if (!currentTimetable) {
                        throw e;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            setError('Failed to load data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to calculate next class information
    const calculateNextClass = (enrichedSubjects: SubjectWithTiming[], currentTime: Date): NextClassInfo | null => {
        if (enrichedSubjects.length === 0) return null;

        const now = currentTime.getHours() * 60 + currentTime.getMinutes();

        // Parse "HH:MM" or "HH:MM AM/PM" safely
        const parseTime = (timeStr: string): number => {
            if (!timeStr) return 0;
            const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
            if (!match) return 0;
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const meridiem = match[3]?.toUpperCase();
            if (meridiem === 'PM' && hours < 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;
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
                
                // Filter out empty subjects (where name is missing or whitespace)
                const validSubjects = enrichedSubjects.filter(sub => sub.name && sub.name.trim().length > 0);
                
                setSubjects(validSubjects);

                // Calculate next class info based on valid subjects
                const nextInfo = calculateNextClass(validSubjects, today);
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

    const getDayOrderColor = (order: number | null) => {
        if (!order) return Colors.dayOrder.holiday;
        // @ts-ignore
        return Colors.dayOrder[order] || Colors.primary;
    };

    const formatUpcomingDate = (dateStr: string): string => {
        const raw = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                <StatusBar barStyle="dark-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                >
                    <View style={styles.header}>
                        <Text style={styles.greeting}>{DayOrderHelper.getGreeting(currentDate)}</Text>
                        <Text style={styles.date}>{DayOrderHelper.formatDate(currentDate)}</Text>
                    </View>

                    {/* Day Order & Upcoming Event Row (separate sibling cards, zero extra vertical bloat) */}
                    <View style={styles.topSummaryRow}>
                        <Card
                            style={[
                                styles.dayOrderCard,
                                nextEvent
                                    ? todayConfig === null || todayConfig.isHoliday || !!todayConfig.event
                                        ? styles.dayOrderCardMedium
                                        : styles.dayOrderCardCompact
                                    : styles.dayOrderCardFull,
                                { backgroundColor: getDayOrderColor(todayConfig?.dayOrder || null) },
                            ]}
                        >
                            <View style={styles.dayOrderInner}>
                                <Text style={styles.dayLabel}>
                                    {todayConfig === null ? 'Today' : todayConfig.isHoliday ? 'Holiday' : 'Day Order'}
                                </Text>
                                <Text
                                    style={[
                                        styles.dayValue,
                                        (todayConfig === null || todayConfig.isHoliday) && styles.dayValueText,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {todayConfig === null ? 'No Info' : todayConfig.isHoliday ? (todayConfig.event || 'No Classes') : todayConfig.dayOrder || '-'}
                                </Text>
                                {todayConfig === null && (
                                    <Text style={styles.eventSubText} numberOfLines={2}>
                                        Calendar not updated yet
                                    </Text>
                                )}
                                {todayConfig !== null && !todayConfig.isHoliday && todayConfig.event && (
                                    <Text style={styles.eventSubText} numberOfLines={1}>
                                        {todayConfig.event}
                                    </Text>
                                )}
                            </View>
                        </Card>

                        {nextEvent && (
                            <TouchableOpacity
                                activeOpacity={0.78}
                                onPress={() => router.navigate('/(tabs)/calendar')}
                                accessibilityRole="button"
                                accessibilityLabel={`Upcoming ${nextEvent.isHoliday ? 'holiday' : 'event'}: ${nextEvent.name}, in ${nextEvent.daysLeft} ${nextEvent.daysLeft === 1 ? 'day' : 'days'}. Open calendar`}
                                style={styles.upcomingCardWrap}
                            >
                                <Card style={styles.upcomingCard}>
                                    <View style={styles.upcomingCardInner}>
                                        <View style={styles.upcomingHeaderRow}>
                                            <Text
                                                style={[
                                                    styles.upcomingTypeLabel,
                                                    nextEvent.isHoliday && styles.upcomingTypeHoliday,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {nextEvent.isHoliday ? 'HOLIDAY' : 'UPCOMING'}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.upcomingDaysBadge,
                                                    nextEvent.isHoliday ? styles.upcomingBadgeHoliday : styles.upcomingBadgeEvent,
                                                ]}
                                            >
                                                <Text style={styles.upcomingDaysText}>
                                                    {nextEvent.daysLeft === 0 ? 'Today' : `${nextEvent.daysLeft}d`}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.upcomingTitle} numberOfLines={2} ellipsizeMode="tail">
                                            {nextEvent.name}
                                        </Text>
                                        <Text style={styles.upcomingMeta} numberOfLines={1}>
                                            {formatUpcomingDate(nextEvent.date)}
                                        </Text>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Next Class Card */}
                    {todayConfig !== null && !todayConfig.isHoliday && nextClassInfo && (
                        <Card style={styles.nextClassCard}>
                            <View style={styles.nextClassContainer}>
                                <View style={styles.nextClassHeader}>
                                    <View style={styles.nextClassTag}>
                                        <Text style={styles.nextClassLabel}>
                                            {nextClassInfo.status === 'during' ? 'Current Class' :
                                                nextClassInfo.status === 'before' ? 'First Class' :
                                                    nextClassInfo.status === 'between' ? 'Up Next' :
                                                        'Classes Completed'}
                                        </Text>
                                    </View>
                                </View>

                                {nextClassInfo.status === 'during' && nextClassInfo.current && (
                                    <View style={styles.classDetailsContainer}>
                                        <View style={styles.nextClassRow}>
                                            <View style={styles.currentClassInfo}>
                                                <Text style={styles.nextClassName}>{nextClassInfo.current.name}</Text>
                                                {!!nextClassInfo.current.teacher?.trim() && (
                                                    <Text style={styles.nextClassCode}>
                                                        {nextClassInfo.current.teacher.trim()}
                                                    </Text>
                                                )}
                                                <Text style={styles.nextClassTime}>
                                                    {nextClassInfo.current.startTime} - {nextClassInfo.current.endTime}
                                                </Text>
                                            </View>
                                        </View>
                                        {nextClassInfo.next && (
                                            <View style={styles.upNextContainer}>
                                                <Text style={styles.upNextLabel}>Following next</Text>
                                                <Text style={styles.upNextName}>{nextClassInfo.next.name}</Text>
                                                <Text style={styles.upNextTime}>
                                                    in {Math.floor(nextClassInfo.minutesUntilNext / 60)}h {nextClassInfo.minutesUntilNext % 60}m
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {(nextClassInfo.status === 'before' || nextClassInfo.status === 'between') && nextClassInfo.next && (
                                    <View style={styles.nextClassRow}>
                                        <View style={styles.nextClassMainInfo}>
                                            <Text style={styles.nextClassName}>{nextClassInfo.next.name}</Text>
                                            {!!nextClassInfo.next.teacher?.trim() && (
                                                <Text style={styles.nextClassCode}>
                                                    {nextClassInfo.next.teacher.trim()}
                                                </Text>
                                            )}
                                            <Text style={styles.nextClassTime}>
                                                {nextClassInfo.next.startTime} - {nextClassInfo.next.endTime}
                                            </Text>
                                        </View>
                                        <View style={styles.countdownBox}>
                                            <Text style={styles.countdownTime}>
                                                {String(Math.floor(nextClassInfo.minutesUntilNext / 60)).padStart(2, '0')}:{String(nextClassInfo.minutesUntilNext % 60).padStart(2, '0')}
                                            </Text>
                                            <Text style={styles.countdownLabel}>
                                                {nextClassInfo.minutesUntilNext < 60 ? 'min' : 'hrs'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {nextClassInfo.status === 'after' && (
                                    <View style={styles.classDetailsContainer}>
                                        <View style={styles.nextClassMainInfo}>
                                            <Text style={styles.nextClassName}>All Classes Completed</Text>
                                            <Text style={styles.nextClassCode}>Great work today</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Card>
                    )}

                    {/* Contributor for Current Class */}
                    {contributor && todayConfig !== null && !todayConfig.isHoliday && nextClassInfo && (
                        <View style={styles.contributorContainerSmall}>
                            <Text style={styles.contributorTextSmall}>Contributed by: {contributor}</Text>
                        </View>
                    )}

                    {/* Timetable List */}
                    {todayConfig !== null && !todayConfig.isHoliday && subjects.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
                            {subjects.map((sub, index) => {
                                const subAtt = findSubjectAttendance(sub, attendanceData);
                                const attTheme = subAtt ? getAttendanceTheme(subAtt.percentage) : null;
                                return (
                                    <Card
                                        key={index}
                                        style={[
                                            styles.subjectCard,
                                            attTheme
                                                ? {
                                                      backgroundColor: attTheme.cardBg,
                                                      borderColor: attTheme.cardBorder,
                                                      borderWidth: 1,
                                                  }
                                                : undefined,
                                        ]}
                                    >
                                        <View style={styles.subjectCardContent}>
                                            <View
                                                style={[
                                                    styles.timeContainer,
                                                    attTheme ? { borderRightColor: attTheme.cardBorder } : undefined,
                                                ]}
                                            >
                                                <Text style={styles.time}>{sub.startTime}</Text>
                                                <Text style={styles.timeEnd}>{sub.endTime}</Text>
                                            </View>
                                            <View style={styles.subjectInfo}>
                                                <Text style={styles.subjectName}>{sub.name}</Text>
                                                {!!sub.teacher?.trim() && (
                                                    <Text style={styles.subjectCode}>
                                                        {sub.teacher.trim()}
                                                    </Text>
                                                )}
                                            </View>
                                            {subAtt && attTheme && (
                                                <View style={[styles.attBadge, { backgroundColor: attTheme.pillBg }]}>
                                                    <Text style={[styles.attBadgeText, { color: attTheme.pillText }]}>
                                                        {subAtt.percentage.toFixed(0)}%
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </Card>
                                );
                            })}
                        </View>
                    )}

                    {/* Empty Schedule State - only when day order exists but no timetable */}
                    {todayConfig !== null && !todayConfig.isHoliday && todayConfig.dayOrder && subjects.length === 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
                            <Card style={styles.subjectCard}>
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ textAlign: 'center', color: Colors.textLight, marginBottom: 12 }}>
                                        {isCustom ? 'No classes scheduled for today.' : 'No timetable found for your class.'}
                                    </Text>
                                    <Button 
                                        title={isCustom ? "Edit Timetable" : "Create & Contribute"} 
                                        onPress={() => router.navigate('/(tabs)/timetable')} 
                                        variant={isCustom ? "secondary" : "primary"} 
                                    />
                                </View>
                            </Card>
                        </View>
                    )}

                    {/* Contributor for Today's Schedule */}
                    {contributor && todayConfig !== null && !todayConfig.isHoliday && subjects.length > 0 && (
                        <View style={styles.contributorContainerSmall}>
                            <Text style={styles.contributorTextSmall}>Contributed by: {contributor}</Text>
                        </View>
                    )}

                    {todayConfig?.isHoliday && (
                        <View style={styles.holidayContainer}>
                            <Text style={styles.holidayText}>Enjoy your day off!</Text>
                        </View>
                    )}

                    {/* Removed bottom contributor footer as it's now inline */}

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
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 120,
    },
    header: {
        marginBottom: 14,
    },
    greeting: {
        fontSize: 26,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        letterSpacing: -0.6,
    },
    date: {
        fontSize: 13.5,
        color: Colors.textLight,
        marginTop: 1,
        fontFamily: 'Poppins_500Medium',
    },
    topSummaryRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
        marginBottom: 12,
    },
    dayOrderCard: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.07)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 0,
    },
    dayOrderCardCompact: {
        flexShrink: 0,
        minWidth: 92,
    },
    dayOrderCardMedium: {
        flex: 0.9,
        minWidth: 108,
    },
    dayOrderCardFull: {
        flex: 1,
    },
    dayOrderInner: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayLabel: {
        fontSize: 12,
        color: Colors.textLight,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    dayValue: {
        fontSize: 32,
        lineHeight: 38,
        fontFamily: 'Poppins_800ExtraBold',
        color: Colors.text,
        marginTop: 2,
        fontVariant: ['tabular-nums'],
        textAlign: 'center',
    },
    dayValueText: {
        fontSize: 19,
        lineHeight: 24,
    },
    upcomingCardWrap: {
        flex: 1,
    },
    upcomingCard: {
        flex: 1,
        borderRadius: 22,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 0,
    },
    upcomingCardInner: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: 3,
    },
    upcomingHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    upcomingTypeLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: Colors.primaryDark,
        letterSpacing: 0.5,
    },
    upcomingTypeHoliday: {
        color: '#B45309',
    },
    upcomingDaysBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upcomingBadgeEvent: {
        backgroundColor: Colors.primary,
    },
    upcomingBadgeHoliday: {
        backgroundColor: '#B45309',
    },
    upcomingDaysText: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
    upcomingTitle: {
        fontSize: 14,
        lineHeight: 19,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
    },
    upcomingMeta: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
    },
    // Subjects
    section: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 19,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    subjectCard: {
        marginBottom: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        width: '100%',
    },
    subjectCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeContainer: {
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: 'rgba(15, 23, 42, 0.10)',
        alignItems: 'center',
        width: 82,
        justifyContent: 'center',
    },
    time: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        fontVariant: ['tabular-nums'],
    },
    timeEnd: {
        fontSize: 11.5,
        color: Colors.textLight,
        marginTop: 2,
        fontFamily: 'Poppins_500Medium',
        fontVariant: ['tabular-nums'],
    },
    subjectInfo: {
        paddingLeft: 12,
        flex: 1,
        justifyContent: 'center',
    },
    subjectName: {
        fontSize: 15.5,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 2,
        lineHeight: 21,
    },
    subjectCode: {
        fontSize: 13,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
    },
    attBadge: {
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 999,
        marginLeft: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    attBadgeText: {
        fontSize: 12.5,
        fontFamily: 'Poppins_700Bold',
        fontVariant: ['tabular-nums'],
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
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 14,
        marginBottom: 12,
    },
    nextClassContainer: {
        gap: 8,
    },
    nextClassHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextClassTag: {
        backgroundColor: '#E0EAFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    nextClassLabel: {
        fontSize: 11.5,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.primaryDark,
    },
    classDetailsContainer: {
        gap: 14,
    },
    nextClassRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    currentClassInfo: {
        flex: 1,
    },
    nextClassMainInfo: {
        flex: 1,
    },
    nextClassName: {
        fontSize: 19,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginBottom: 4,
        lineHeight: 25,
    },
    nextClassCode: {
        fontSize: 13.5,
        color: Colors.textLight,
        marginBottom: 4,
        fontFamily: 'Poppins_500Medium',
    },
    nextClassTime: {
        fontSize: 13.5,
        color: Colors.textLight,
        fontFamily: 'Poppins_600SemiBold',
        fontVariant: ['tabular-nums'],
    },
    upNextContainer: {
        backgroundColor: '#F3F5F9',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.07)',
        marginTop: 4,
    },
    upNextLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.primaryDark,
        marginBottom: 3,
    },
    upNextName: {
        fontSize: 14.5,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 2,
    },
    upNextTime: {
        fontSize: 12.5,
        color: Colors.textLight,
        fontFamily: 'Poppins_500Medium',
    },
    countdownBox: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 82,
    },
    countdownTime: {
        fontSize: 21,
        fontFamily: 'Poppins_700Bold',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
    countdownLabel: {
        fontSize: 11,
        color: '#FFFFFF',
        opacity: 0.9,
        marginTop: 1,
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
    contributorContainerSmall: {
        marginTop: 4,
        marginBottom: 12,
        alignItems: 'flex-end',
        paddingRight: 4,
    },
    contributorTextSmall: {
        fontSize: 10,
        color: Colors.textLight,
        fontFamily: 'Poppins_400Regular',
        fontStyle: 'italic',
        opacity: 0.7,
    },
});
