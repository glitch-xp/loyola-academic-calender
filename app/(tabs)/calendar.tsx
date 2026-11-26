import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { StorageService } from '../../services/StorageService';
import { DayOrderConfig, TimeTable, MasterConfig, UserProfile } from '../../types';
import { DayOrderHelper } from '../../utils/DayOrderHelper';
import { TimetableHelper, SubjectWithTiming } from '../../utils/TimetableHelper';
import { Card } from '../../components/Card';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { AltArrowLeftIcon, AltArrowRightIcon, CloseCircleIcon } from '../../components/ui/GlassIcons';
import { LiquidBackground } from '../../components/LiquidBackground';
import { LiquidGlassSurface } from '../../components/ui/LiquidGlassSurface';
import { ErrorScreen } from '../../components/ErrorScreen';
import { router, useFocusEffect } from 'expo-router';
import { DataService } from '../../services/DataService';
import { Skeleton } from '../../components/ui/Skeleton';

function parseEventDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

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

    const upcomingEvents = React.useMemo(() => {
        if (!calendarConfig) return [];
        return DayOrderHelper.getEventsForMonth(calendarConfig, currentMonth);
    }, [currentMonth, calendarConfig]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            let cal = await StorageService.getData<DayOrderConfig>('day_order_config');
            let tt = await StorageService.getData<TimeTable>('timetable');
            let mc = await StorageService.getData<MasterConfig>('master_config');
            let profile = await StorageService.getUserProfile();

            // Background Sync
            if (profile) {
                try {
                    const courseData = await DataService.fetchCourseData(
                        profile.department,
                        profile.year,
                        profile.shift,
                        profile.section
                    );
                    
                    cal = courseData.calendar;
                    // Update Cache
                    const customTT = await StorageService.getData<TimeTable>('custom_timetable');
                    if (!customTT) {
                        tt = courseData.timetable;
                        await StorageService.saveData('timetable', courseData.timetable);
                    }
                    await StorageService.saveData('day_order_config', courseData.calendar);
                } catch (e) {
                    console.log('Sync failed (offline or error), using cached data');
                }
            }

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

            // Events will be computed by useMemo watching calendarConfig and currentMonth
        } catch (e) {
            console.error(e);
            setError('Failed to load calendar data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

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
                style={styles.dayCell}
                onPress={() => handleDayPress(date)}
                activeOpacity={0.7}
            >
                <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                    <Text style={[styles.dayText, isToday && styles.todayText]}>{date.getDate()}</Text>
                </View>
                {dayInfo?.dayOrder ? (
                    <View style={[styles.dayOrderChip, { backgroundColor: bgColor }]}>
                        <Text style={styles.dayOrderChipText}>D{dayInfo.dayOrder}</Text>
                    </View>
                ) : dayInfo?.isHoliday ? (
                    <View style={[styles.dayOrderChip, styles.holidayChip]}>
                        <Text style={styles.holidayChipText}>HOL</Text>
                    </View>
                ) : (
                    <View style={styles.dayOrderChipSpacer} />
                )}
            </TouchableOpacity>
        );
    };

    // Show loading state
    if (loading) {
        return (
            <LiquidBackground>
                <SafeAreaView style={[styles.container, { padding: 20 }]} edges={['top', 'bottom', 'left', 'right']}>
                    <View style={styles.header}>
                        <Skeleton width={44} height={44} borderRadius={22} />
                        <Skeleton width={160} height={44} borderRadius={22} />
                        <Skeleton width={44} height={44} borderRadius={22} />
                    </View>
                    <View style={styles.weekRow}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, i) => (
                            <Skeleton key={i} width={20} height={20} borderRadius={10} />
                        ))}
                    </View>
                    <View style={styles.calendarGrid}>
                        {Array.from({ length: 35 }).map((_, i) => (
                            <View key={i} style={styles.dayCell}>
                                <Skeleton width={36} height={36} borderRadius={18} />
                            </View>
                        ))}
                    </View>
                </SafeAreaView>
            </LiquidBackground>
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
        <LiquidBackground>
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                {/* Floating Liquid Glass Month Navigation Bar */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        accessibilityLabel="Previous month"
                        activeOpacity={0.75}
                    >
                        <LiquidGlassSurface
                            interactive
                            borderRadius={22}
                            style={styles.navGlassCircle}
                        >
                            <AltArrowLeftIcon color={Colors.text} size={20} />
                        </LiquidGlassSurface>
                    </TouchableOpacity>

                    <LiquidGlassSurface
                        borderRadius={22}
                        style={styles.monthGlassPill}
                    >
                        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
                    </LiquidGlassSurface>

                    <TouchableOpacity
                        onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        accessibilityLabel="Next month"
                        activeOpacity={0.75}
                    >
                        <LiquidGlassSurface
                            interactive
                            borderRadius={22}
                            style={styles.navGlassCircle}
                        >
                            <AltArrowRightIcon color={Colors.text} size={20} />
                        </LiquidGlassSurface>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.grid}>
                    <Card style={styles.calendarCard}>
                        <View style={styles.weekRow}>
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                                <Text key={i} style={styles.weekText}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {padding.map((_, i) => renderDay(null, i))}
                            {days.map((d, i) => renderDay(d, i))}
                        </View>

                        {/* Compact Day Order Legend Strip */}
                        <View style={styles.legendRow}>
                            {[1, 2, 3, 4, 5, 6].map((order) => (
                                <View
                                    key={order}
                                    style={[
                                        styles.legendPill,
                                        // @ts-ignore
                                        { backgroundColor: Colors.dayOrder[order] },
                                    ]}
                                >
                                    <Text style={styles.legendText}>Day {order}</Text>
                                </View>
                            ))}
                            <View style={[styles.legendPill, styles.holidayChip]}>
                                <Text style={styles.holidayChipText}>Holiday</Text>
                            </View>
                        </View>
                    </Card>

                    {/* Upcoming Events List */}
                    <View style={styles.eventsSection}>
                        <Text style={styles.sectionTitle}>Upcoming in {format(currentMonth, 'MMMM')}</Text>
                        {upcomingEvents.length === 0 ? (
                            <Text style={styles.emptyText}>No upcoming events found.</Text>
                        ) : (
                            upcomingEvents.map((event, index) => {
                                const parsedDate = parseEventDate(event.date);
                                return (
                                    <Card key={index} style={event.daysLeft < 0 ? { ...styles.eventCard, opacity: 0.65 } : styles.eventCard}>
                                        <View style={styles.eventRow}>
                                            <View style={styles.dateBox}>
                                                <Text style={styles.dateMonth}>{parsedDate ? format(parsedDate, 'MMM') : '--'}</Text>
                                                <Text style={styles.dateDay}>{parsedDate ? format(parsedDate, 'dd') : '--'}</Text>
                                            </View>
                                        <View style={styles.eventInfo}>
                                            <View style={styles.eventHeader}>
                                                <Text style={styles.eventName}>{event.name}</Text>
                                                {event.isHoliday && <View style={styles.holidayBadge}><Text style={styles.holidayBadgeText}>Holiday</Text></View>}
                                            </View>
                                            <Text style={styles.eventTime}>
                                                {event.daysLeft === 0 ? 'Today' :
                                                    event.daysLeft === 1 ? 'Tomorrow' :
                                                        event.daysLeft < 0 ? (
                                                            event.daysLeft === -1 ? 'Yesterday' : `${Math.abs(event.daysLeft)} days ago`
                                                        ) : `in ${event.daysLeft} days`}
                                            </Text>
                                        </View>
                                    </View>
                                </Card>
                                );
                            })
                        )}
                    </View>
                    <View style={{ height: 112 }} />
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
                                <CloseCircleIcon color={Colors.textLight} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {selectedDate && (() => {
                                const info = getDayInfo(selectedDate);
                                if (!info) return (
                                    <View style={styles.modalBody}>
                                        <Text style={styles.relaxText}>Calendar not updated for this date yet.</Text>
                                    </View>
                                );

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
                                            {info.event && (
                                                <View style={styles.modalEventContainer}>
                                                    <Text style={styles.modalEventTitle}>{info.event}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.orderTitle}>Day Order {info.dayOrder}</Text>
                                            {classes.map((cls, idx) => (
                                                <View key={idx} style={styles.classRow}>
                                                    <Text style={styles.classTime}>{cls.startTime}</Text>
                                                    <View style={styles.classDetails}>
                                                        <Text style={styles.className}>{cls.name}</Text>
                                                        <Text style={styles.classCode}>
                                                            {[cls.code, cls.teacher].filter(Boolean).join(' • ')}
                                                        </Text>
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
            </SafeAreaView >
        </LiquidBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 12,
    },
    navGlassCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthGlassPill: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    monthTitle: {
        fontSize: 17,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    calendarCard: {
        borderRadius: 24,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        marginBottom: 8,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    },
    weekText: {
        width: '14.28%',
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 11,
        fontFamily: 'Poppins_600SemiBold',
    },
    grid: {
        paddingHorizontal: 20,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    dayCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayCircle: {
        backgroundColor: Colors.primary,
    },
    dayText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        fontVariant: ['tabular-nums'],
    },
    todayText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins_700Bold',
    },
    dayOrderChip: {
        marginTop: 3,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 999,
        minWidth: 28,
        alignItems: 'center',
    },
    dayOrderChipText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
    },
    holidayChip: {
        backgroundColor: '#FFE4E6',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#FDA4AF',
    },
    holidayChipText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: '#9F1239',
    },
    dayOrderChipSpacer: {
        height: 17,
        marginTop: 3,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(15, 23, 42, 0.08)',
    },
    legendPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    legendText: {
        fontSize: 10.5,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
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
    modalEventContainer: {
        backgroundColor: Colors.dayOrder[3], // Amber/Yellow
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalEventTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
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
    },

    // Events Section
    eventsSection: {
        marginTop: 18,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 16,
        fontFamily: 'Poppins_700Bold',
    },
    emptyText: {
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    eventCard: {
        marginBottom: 12,
        // backgroundColor: Colors.surface, // Removed to allow Card gradient
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateBox: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        minWidth: 60,
    },
    dateMonth: {
        fontSize: 12,
        color: Colors.textLight,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    dateDay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    eventInfo: {
        flex: 1,
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    eventName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginRight: 8,
    },
    holidayBadge: {
        backgroundColor: Colors.dayOrder.holiday,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    holidayBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    eventTime: {
        fontSize: 14,
        color: Colors.textLight,
    }
});
