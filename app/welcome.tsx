import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataService, NetworkError, DataFetchError } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { MasterConfig } from '../types';
import { NoNetworkScreen } from '../components/NoNetworkScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export default function WelcomeScreen() {
    const [config, setConfig] = useState<MasterConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<{ type: 'network' | 'general'; message: string } | null>(null);

    // Selection State
    const [dept, setDept] = useState('');
    const [year, setYear] = useState('');
    const [shift, setShift] = useState('');

    // Section State
    const [section, setSection] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await DataService.fetchMasterConfig();
            setConfig(data);
            // Pre-select first options if available to save clicks
            if (data.departments.length > 0) setDept(data.departments[0].name);
            // Default year will be handled by useEffect or user selection logic, 
            // but we can try to key off the first department
            if (data.departments[0]?.years.length > 0) setYear(data.departments[0].years[0].year);

            // Note: shift will be auto-selected in useEffect when availableShifts changes
        } catch (e) {
            if (e instanceof NetworkError) {
                setError({ type: 'network', message: e.message });
            } else if (e instanceof DataFetchError) {
                setError({ type: 'general', message: e.message });
            } else {
                setError({ type: 'general', message: 'Failed to load configuration. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    // Compute available shifts based on selected department and year
    const availableShifts = React.useMemo(() => {
        if (!config || !dept || !year) return [];

        const selectedDept = config.departments.find(d => d.name === dept);
        if (!selectedDept) return [];

        const selectedYear = selectedDept.years.find(y => y.year === year);
        if (!selectedYear) return [];

        // Check if using the new shiftDetails structure
        if (selectedYear.shiftDetails) {
            const shiftIds = selectedYear.shiftDetails.map(s => s.shiftId);
            return config.shifts.filter(s => shiftIds.includes(s.id));
        }

        // Legacy behavior
        const shiftIds = selectedYear.shifts || config.shifts.map(s => s.id);
        return config.shifts.filter(s => shiftIds.includes(s.id));
    }, [config, dept, year]);

    // Auto-select shift when only one is available or reset when selection changes
    React.useEffect(() => {
        if (availableShifts.length === 1) {
            setShift(availableShifts[0].id);
        } else if (availableShifts.length > 1 && !availableShifts.find(s => s.id === shift)) {
            // Reset shift if current selection is not in available shifts
            setShift(availableShifts[0]?.id || '');
        }
    }, [availableShifts]);

    // Compute available sections based on selected department, year, and shift
    const availableSections = React.useMemo(() => {
        if (!config || !dept || !year || !shift) return [];

        const selectedDept = config.departments.find(d => d.name === dept);
        const selectedYear = selectedDept?.years.find(y => y.year === year);

        if (selectedYear?.shiftDetails) {
            const shiftDetail = selectedYear.shiftDetails.find(s => s.shiftId === shift);
            if (shiftDetail?.sections) {
                return shiftDetail.sections;
            }
        }
        return [];
    }, [config, dept, year, shift]);

    // Auto-select section when only one is available
    React.useEffect(() => {
        if (availableSections.length === 1) {
            setSection(availableSections[0].name);
        } else if (availableSections.length > 1 && !availableSections.find(s => s.name === section)) {
            setSection('');
        }
    }, [availableSections]);


    const handleComplete = async () => {
        // Validation
        if (!dept || !year || (availableShifts.length > 1 && !shift)) {
            Alert.alert('Incomplete', 'Please select all required fields');
            return;
        }

        if (availableSections.length > 0 && !section) {
            Alert.alert('Incomplete', 'Please select a section');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            // Fetch and cache the initial data for this course
            const courseData = await DataService.fetchCourseData(dept, year, shift, section);

            // Save Config & Data
            await StorageService.saveUserProfile({ department: dept, year: year as any, shift, section });
            await StorageService.saveData('master_config', config);
            await StorageService.saveData('timetable', courseData.timetable);
            await StorageService.saveData('day_order_config', courseData.calendar);

            // Save contributor info if available
            if (courseData.contributor) {
                await StorageService.saveData('contributor', courseData.contributor);
            } else {
                await StorageService.removeData('contributor');
            }

            // @ts-ignore
            router.replace('/(tabs)/home');
        } catch (e) {
            if (e instanceof NetworkError) {
                setError({ type: 'network', message: e.message });
            } else if (e instanceof DataFetchError) {
                setError({ type: 'general', message: e.message });
            } else {
                setError({ type: 'general', message: 'Failed to setup course data.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Show error screens
    if (error) {
        if (error.type === 'network') {
            return <NoNetworkScreen onRetry={loadConfig} message={error.message} />;
        } else {
            return <ErrorScreen onRetry={loadConfig} message={error.message} />;
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Loyola Time Table App</Text>
                    <Text style={styles.subtitle}>Setup your course details to get started</Text>
                </View>

                <Card>
                    <Text style={styles.label}>Department</Text>
                    <View style={styles.pillsContainer}>
                        {config?.departments.map((d) => (
                            <OptionPill key={d.name} label={d.name} selected={dept === d.name} onPress={() => {
                                setDept(d.name);
                                // Reset year when dept changes if not valid
                                const validYears = d.years.map(y => y.year);
                                if (!validYears.includes(year as any)) {
                                    setYear(validYears[0] || '');
                                }
                            }} />
                        ))}
                    </View>

                    <Text style={styles.label}>Year</Text>
                    <View style={styles.pillsContainer}>
                        {config?.departments.find(d => d.name === dept)?.years.map((y) => (
                            <OptionPill key={y.year} label={y.year} selected={year === y.year} onPress={() => setYear(y.year)} />
                        ))}
                    </View>

                    {/* Only show shift selector if multiple shifts are available */}
                    {availableShifts.length > 1 && (
                        <>
                            <Text style={styles.label}>Shift</Text>
                            <View style={styles.pillsContainer}>
                                {availableShifts.map((s) => (
                                    <OptionPill key={s.id} label={s.name} selected={shift === s.id} onPress={() => setShift(s.id)} />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Only show section selector if sections are available */}
                    {availableSections.length > 0 && (
                        <>
                            <Text style={styles.label}>Section</Text>
                            <View style={styles.pillsContainer}>
                                {availableSections.map((s) => (
                                    <OptionPill key={s.name} label={s.name} selected={section === s.name} onPress={() => setSection(s.name)} />
                                ))}
                            </View>
                        </>
                    )}
                </Card>

                <View style={styles.footer}>
                    <Button
                        title="Get Started"
                        onPress={handleComplete}
                        loading={submitting}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function OptionPill({ label, selected, onPress }: { label: string, selected: boolean, onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 60, // Extra padding for gesture gesture area
    },
    header: {
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 12,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F3F4F6', // Gray-100
        borderWidth: 1,
        borderColor: 'transparent',
    },
    pillSelected: {
        backgroundColor: Colors.highlight,
        borderColor: Colors.primary,
    },
    pillText: {
        color: Colors.textLight,
        fontWeight: '500',
    },
    pillTextSelected: {
        color: Colors.primaryDark,
        fontWeight: '600',
    },
    footer: {
        marginTop: 20,
    }
});
