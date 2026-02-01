import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DataService } from '../services/DataService';
import { StorageService } from '../services/StorageService';
import { MasterConfig } from '../types';

export default function WelcomeScreen() {
    const [config, setConfig] = useState<MasterConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Selection State
    const [dept, setDept] = useState('');
    const [year, setYear] = useState('');
    const [shift, setShift] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await DataService.fetchMasterConfig();
            setConfig(data);
            // Pre-select first options if available to save clicks
            if (data.departments.length > 0) setDept(data.departments[0].name);
            // Default year will be handled by useEffect or user selection logic, 
            // but we can try to key off the first department
            if (data.departments[0]?.years.length > 0) setYear(data.departments[0].years[0].year);

            if (data.shifts.length > 0) setShift(data.shifts[0].id);
        } catch (e) {
            Alert.alert('Error', 'Failed to load configuration. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!dept || !year || !shift) {
            Alert.alert('Incomplete', 'Please select all fields');
            return;
        }

        setSubmitting(true);
        try {
            // Fetch and cache the initial data for this course
            const courseData = await DataService.fetchCourseData(dept, year, shift);

            // Save Config & Data
            await StorageService.saveUserProfile({ department: dept, year: year as any, shift });
            await StorageService.saveData('master_config', config);
            await StorageService.saveData('timetable', courseData.timetable);
            await StorageService.saveData('day_order_config', courseData.calendar);

            // @ts-ignore
            router.replace('/(tabs)/home');
        } catch (e) {
            Alert.alert('Error', 'Failed to setup course data.');
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

                    <Text style={styles.label}>Shift</Text>
                    <View style={styles.pillsContainer}>
                        {config?.shifts.map((s) => (
                            <OptionPill key={s.id} label={s.name} selected={shift === s.id} onPress={() => setShift(s.id)} />
                        ))}
                    </View>
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
