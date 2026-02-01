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
    const [section, setSection] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await DataService.fetchMasterConfig();
            setConfig(data);
            // Pre-select first options if available to save clicks
            if (data.departments.length > 0) setDept(data.departments[0]);
            if (data.years.length > 0) setYear(data.years[0]);
            if (data.sections.length > 0) setSection(data.sections[0]);
        } catch (e) {
            Alert.alert('Error', 'Failed to load configuration. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!dept || !year || !section) {
            Alert.alert('Incomplete', 'Please select all fields');
            return;
        }

        setSubmitting(true);
        try {
            // Fetch and cache the initial data for this course
            const courseData = await DataService.fetchCourseData(dept, year, section);

            // Save Config & Data
            await StorageService.saveUserProfile({ department: dept, year: year as any, section });
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
                            <OptionPill key={d} label={d} selected={dept === d} onPress={() => setDept(d)} />
                        ))}
                    </View>

                    <Text style={styles.label}>Year</Text>
                    <View style={styles.pillsContainer}>
                        {config?.years.map((y) => (
                            <OptionPill key={y} label={y} selected={year === y} onPress={() => setYear(y)} />
                        ))}
                    </View>

                    <Text style={styles.label}>Section</Text>
                    <View style={styles.pillsContainer}>
                        {config?.sections.map((s) => (
                            <OptionPill key={s} label={s} selected={section === s} onPress={() => setSection(s)} />
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
