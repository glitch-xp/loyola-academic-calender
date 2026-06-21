import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { StorageService } from '@/services/StorageService';
import { DataService, DataFetchError, NetworkError } from '@/services/DataService';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Subject, TimeTable, UserProfile, MasterConfig } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

const DAYS = [1, 2, 3, 4, 5, 6];
const PERIODS = [1, 2, 3, 4, 5];
const LOCAL_TT_KEY = 'custom_timetable';

interface EditableEntry {
    name: string;
    code: string;
    teacher: string;
}

type EditableGrid = Record<number, EditableEntry[]>;

function createEmptyGrid(): EditableGrid {
    const grid: EditableGrid = {};
    for (const d of DAYS) {
        grid[d] = PERIODS.map(() => ({ name: '', code: '', teacher: '' }));
    }
    return grid;
}

function timetableToGrid(tt: TimeTable): EditableGrid {
    const grid = createEmptyGrid();
    for (const d of DAYS) {
        const subjects = tt[d] || [];
        for (let p = 0; p < subjects.length && p < PERIODS.length; p++) {
            grid[d][p] = {
                name: subjects[p].name || '',
                code: subjects[p].code || '',
                teacher: subjects[p].teacher || '',
            };
        }
    }
    return grid;
}

function gridToTimetable(grid: EditableGrid): TimeTable {
    const tt: TimeTable = {};
    for (const d of DAYS) {
        tt[d] = grid[d].map(e => ({
            name: e.name.trim(),
            code: e.code.trim(),
            ...(e.teacher.trim() ? { teacher: e.teacher.trim() } : {}),
        }));
    }
    return tt;
}

function hasAnySubject(grid: EditableGrid): boolean {
    for (const d of DAYS) {
        for (const entry of grid[d]) {
            if (entry.name.trim().length > 0) return true;
        }
    }
    return false;
}

export default function MyTimetableScreen() {
    const [grid, setGrid] = useState<EditableGrid>(createEmptyGrid);
    const [isCustom, setIsCustom] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [contributing, setContributing] = useState(false);
    const [contributorName, setContributorName] = useState('');
    const [showContributeForm, setShowContributeForm] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
    const [editFormData, setEditFormData] = useState<EditableEntry>({ name: '', code: '', teacher: '' });
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const uniqueSubjects = React.useMemo(() => {
        const subjects = new Map<string, EditableEntry>();
        for (const d of DAYS) {
            for (const entry of grid[d]) {
                if (entry.name.trim()) {
                    const key = `${entry.name.trim().toLowerCase()}-${entry.code.trim().toLowerCase()}`;
                    if (!subjects.has(key)) {
                        subjects.set(key, { ...entry });
                    }
                }
            }
        }
        return Array.from(subjects.values());
    }, [grid]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await StorageService.getUserProfile();
            setUserProfile(profile);

            const config = await StorageService.getData<MasterConfig>('master_config');
            setMasterConfig(config);

            // Background Sync
            let serverTT = await StorageService.getData<TimeTable>('timetable');
            if (profile) {
                try {
                    const courseData = await DataService.fetchCourseData(
                        profile.department,
                        profile.year,
                        profile.shift,
                        profile.section
                    );
                    
                    serverTT = courseData.timetable;

                    // Update Cache
                    await StorageService.saveData('timetable', courseData.timetable);
                    await StorageService.saveData('day_order_config', courseData.calendar);
                } catch (e) {
                    console.log('Sync failed (offline or error), using cached data');
                }
            }

            // Check for local custom timetable first
            const customTT = await StorageService.getData<TimeTable>(LOCAL_TT_KEY);
            if (customTT) {
                setGrid(timetableToGrid(customTT));
                setIsCustom(true);
            } else {
                // Fall back to server timetable
                if (serverTT) {
                    setGrid(timetableToGrid(serverTT));
                    setIsCustom(false);
                }
            }
        } catch (e) {
            console.error('Failed to load timetable:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const updateCell = (day: number, period: number, field: keyof EditableEntry, value: string) => {
        setGrid(prev => {
            const updated = { ...prev };
            updated[day] = [...updated[day]];
            updated[day][period] = { ...updated[day][period], [field]: value };
            return updated;
        });
        setIsCustom(true);
    };

    const handleSaveLocally = async () => {
        setSaving(true);
        try {
            const tt = gridToTimetable(grid);
            await StorageService.saveData(LOCAL_TT_KEY, tt);
            // Also update the main timetable key so the home screen uses it
            await StorageService.saveData('timetable', tt);
            setIsCustom(true);
            showMsg('success', 'Timetable saved!');
        } catch (e) {
            showMsg('error', 'Failed to save timetable');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToServer = () => {
        Alert.alert(
            'Reset to Server',
            'This will discard your custom timetable and use the server version. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await StorageService.removeData(LOCAL_TT_KEY);
                        const serverTT = await StorageService.getData<TimeTable>('timetable');
                        if (serverTT) {
                            setGrid(timetableToGrid(serverTT));
                        } else {
                            setGrid(createEmptyGrid());
                        }
                        setIsCustom(false);
                        showMsg('info', 'Reset to server timetable');
                    }
                }
            ]
        );
    };

    const handleContribute = async () => {
        if (!userProfile) {
            showMsg('error', 'Please set up your profile first');
            return;
        }

        if (!hasAnySubject(grid)) {
            showMsg('error', 'Please add at least one subject before contributing');
            return;
        }

        // Find the department ID from master config
        const dept = masterConfig?.departments.find(d => d.name === userProfile.department);
        if (!dept) {
            showMsg('error', 'Department not found in configuration');
            return;
        }
        const deptId = dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

        setContributing(true);
        try {
            const tt = gridToTimetable(grid);
            const result = await DataService.submitContribution({
                department_id: deptId,
                year: userProfile.year,
                shift_id: userProfile.shift,
                section: userProfile.section,
                contributor_name: contributorName.trim() || undefined,
                timetable_data: tt,
            });

            setShowContributeForm(false);
            setContributorName('');
            showMsg('success', result.message || 'Submitted for review! Thank you 🎉');
        } catch (e) {
            if (e instanceof DataFetchError) {
                showMsg('error', e.message);
            } else if (e instanceof NetworkError) {
                showMsg('error', 'No internet. Please try again later.');
            } else {
                showMsg('error', 'Submission failed. Please try again.');
            }
        } finally {
            setContributing(false);
        }
    };

    const showMsg = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                <View style={styles.scrollContent}>
                    <View style={styles.header}>
                        <Skeleton width={200} height={32} borderRadius={8} style={{ marginBottom: 8 }} />
                        <Skeleton width={150} height={16} borderRadius={4} />
                    </View>
                    <View style={styles.statusRow}>
                        <Skeleton width={80} height={28} borderRadius={14} />
                    </View>
                    <View style={styles.daySelectorContainer}>
                        <View style={[styles.daySelector, { flexDirection: 'row', gap: 8 }]}>
                            {DAYS.map(d => <Skeleton key={d} width={60} height={36} borderRadius={18} />)}
                        </View>
                    </View>
                    <View style={styles.periodList}>
                        {PERIODS.map(p => (
                            <View key={p} style={[styles.periodCard, { height: 80, justifyContent: 'center' }]}>
                                <Skeleton width={100} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                                <Skeleton width="100%" height={20} borderRadius={4} />
                            </View>
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>My Timetable</Text>
                        <Text style={styles.subtitle}>
                            {isCustom
                                ? 'Your Custom Timetable'
                                : (userProfile
                                    ? `${userProfile.department} - Year ${userProfile.year}${userProfile.section ? ` (Sec ${userProfile.section})` : ''}`
                                    : 'Official Timetable')}
                        </Text>
                    </View>

                    {/* Message */}
                    {message && (
                        <View style={[
                            styles.messageBar,
                            message.type === 'success' && styles.messageSuccess,
                            message.type === 'error' && styles.messageError,
                            message.type === 'info' && styles.messageInfo,
                        ]}>
                            <Text style={styles.messageText}>{message.text}</Text>
                        </View>
                    )}

                    {/* Status badge */}
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, isCustom ? styles.statusCustom : styles.statusServer]}>
                            <Text style={[styles.statusText, isCustom ? styles.statusTextCustom : styles.statusTextServer]}>
                                {isCustom ? 'Local' : 'Cloud'}
                            </Text>
                        </View>
                        {isCustom && (
                            <TouchableOpacity onPress={handleResetToServer} style={styles.resetLink}>
                                <Text style={styles.resetLinkText}>Reset to server</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Day Selector */}
                    <View style={styles.daySelectorContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={`day-${day}`}
                                    style={[styles.dayTab, selectedDay === day && styles.dayTabSelected]}
                                    onPress={() => setSelectedDay(day)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextSelected]}>
                                        Day {day}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Periods List */}
                    <View style={styles.periodList}>
                        {PERIODS.map((_, pIdx) => {
                            const entry = grid[selectedDay][pIdx];
                            const isEmpty = !entry.name;
                            
                            return (
                                <TouchableOpacity
                                    key={`period-${pIdx}`}
                                    style={styles.periodCard}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setEditFormData(entry);
                                        setEditingCell({ day: selectedDay, period: pIdx });
                                    }}
                                >
                                    <View style={styles.periodHeader}>
                                        <Text style={styles.periodLabel}>Period {pIdx + 1}</Text>
                                        {!isEmpty && entry.code ? (
                                            <View style={styles.periodBadge}>
                                                <Text style={styles.periodBadgeText}>{entry.code}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    
                                    {isEmpty ? (
                                        <View style={styles.periodEmpty}>
                                            <Text style={styles.periodEmptyText}>+ Tap to add subject</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.periodContent}>
                                            <Text style={styles.periodSubject}>{entry.name}</Text>
                                            {entry.teacher ? (
                                                <Text style={styles.periodMeta}>
                                                    {entry.teacher}
                                                </Text>
                                            ) : null}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <Button
                            title={saving ? 'Saving...' : 'Save Locally'}
                            onPress={handleSaveLocally}
                            variant="primary"
                            loading={saving}
                            style={{ marginBottom: 12 }}
                        />

                        {isCustom && (
                            !showContributeForm ? (
                                <Button
                                    title="Contribute This Timetable"
                                    onPress={() => {
                                        if (!hasAnySubject(grid)) {
                                            showMsg('error', 'Please add at least one subject first');
                                            return;
                                        }
                                        setShowContributeForm(true);
                                    }}
                                    variant="secondary"
                                />
                            ) : (
                                <Card style={styles.contributeCard}>
                                    <Text style={styles.contributeTitle}>Share with fellow students</Text>
                                    <Text style={styles.contributeDesc}>
                                        Your timetable will be reviewed by an admin before being published. It helps students in your department!
                                    </Text>

                                    <TextInput
                                        style={styles.contributorInput}
                                        placeholder="Your name (optional)"
                                        placeholderTextColor={Colors.textLight}
                                        value={contributorName}
                                        onChangeText={setContributorName}
                                        maxLength={50}
                                    />

                                    <View style={styles.contributeButtons}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => {
                                                setShowContributeForm(false);
                                                setContributorName('');
                                            }}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>

                                        <Button
                                            title={contributing ? 'Submitting...' : 'Submit for Review'}
                                            onPress={handleContribute}
                                            variant="primary"
                                            loading={contributing}
                                            style={{ flex: 1 }}
                                        />
                                    </View>
                                </Card>
                            )
                        )}
                    </View>

                    {/* Tip */}
                    <View style={styles.tipContainer}>
                        <Text style={styles.tipText}>
                            💡 Tap any cell to edit. Your local timetable is saved on this device and works offline.
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Edit Modal */}
            <Modal
                visible={!!editingCell}
                transparent
                animationType="fade"
                onRequestClose={() => setEditingCell(null)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Edit Day {editingCell?.day} - Period {editingCell && editingCell.period + 1}
                        </Text>

                        {uniqueSubjects.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsLabel}>Quick Fill:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
                                    {uniqueSubjects.map((sub, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.suggestionChip}
                                            onPress={() => setEditFormData({ ...sub })}
                                        >
                                            <Text style={styles.suggestionChipText}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Subject Name</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Mathematics"
                                placeholderTextColor={Colors.textLight}
                                value={editFormData.name}
                                onChangeText={v => setEditFormData(prev => ({ ...prev, name: v }))}
                                maxLength={100}
                                autoFocus
                            />
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Subject Code</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. MAT101"
                                placeholderTextColor={Colors.textLight}
                                value={editFormData.code}
                                onChangeText={v => setEditFormData(prev => ({ ...prev, code: v }))}
                                maxLength={20}
                            />
                        </View>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Teacher</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Teacher Name"
                                placeholderTextColor={Colors.textLight}
                                value={editFormData.teacher}
                                onChangeText={v => setEditFormData(prev => ({ ...prev, teacher: v }))}
                                maxLength={50}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setEditingCell(null)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSave]}
                                onPress={() => {
                                    if (editingCell) {
                                        updateCell(editingCell.day, editingCell.period, 'name', editFormData.name);
                                        updateCell(editingCell.day, editingCell.period, 'code', editFormData.code);
                                        updateCell(editingCell.day, editingCell.period, 'teacher', editFormData.teacher);
                                    }
                                    setEditingCell(null);
                                }}
                            >
                                <Text style={styles.modalBtnSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
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
        paddingBottom: 120,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textLight,
        marginTop: 4,
    },
    messageBar: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    messageSuccess: {
        backgroundColor: '#D1FAE5',
    },
    messageError: {
        backgroundColor: '#FEE2E2',
    },
    messageInfo: {
        backgroundColor: '#DBEAFE',
    },
    messageText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        textAlign: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusCustom: {
        backgroundColor: '#FEF3C7',
    },
    statusServer: {
        backgroundColor: '#DBEAFE',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextCustom: {
        color: '#92400E',
    },
    statusTextServer: {
        color: '#1E40AF',
    },
    resetLink: {
        padding: 4,
    },
    resetLinkText: {
        color: Colors.error,
        fontSize: 13,
        fontWeight: '500',
    },
    daySelectorContainer: {
        marginBottom: 16,
    },
    daySelector: {
        gap: 8,
        paddingBottom: 4,
    },
    dayTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dayTabSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dayTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textLight,
    },
    dayTabTextSelected: {
        color: '#FFFFFF',
    },
    periodList: {
        gap: 12,
    },
    periodCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    periodHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    periodLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    periodBadge: {
        backgroundColor: Colors.highlight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    periodBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primaryDark,
    },
    periodEmpty: {
        paddingVertical: 8,
    },
    periodEmptyText: {
        fontSize: 15,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    periodContent: {
        gap: 4,
    },
    periodSubject: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    periodMeta: {
        fontSize: 13,
        color: Colors.textLight,
        marginTop: 2,
    },
    actions: {
        marginTop: 20,
    },
    contributeCard: {
        backgroundColor: Colors.highlight,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    contributeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
    },
    contributeDesc: {
        fontSize: 13,
        color: Colors.textLight,
        lineHeight: 20,
        marginBottom: 14,
    },
    contributorInput: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 14,
    },
    contributeButtons: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    cancelBtnText: {
        color: Colors.textLight,
        fontWeight: '500',
        fontSize: 14,
    },
    tipContainer: {
        marginTop: 20,
        padding: 16,
        backgroundColor: Colors.highlight,
        borderRadius: 16,
    },
    tipText: {
        fontSize: 13,
        color: Colors.textLight,
        lineHeight: 20,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    suggestionsContainer: {
        marginBottom: 16,
    },
    suggestionsLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 8,
    },
    suggestionsList: {
        gap: 8,
        paddingBottom: 4,
    },
    suggestionChip: {
        backgroundColor: Colors.highlight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    suggestionChipText: {
        fontSize: 13,
        color: Colors.primaryDark,
        fontWeight: '500',
    },
    modalInputGroup: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 6,
    },
    modalInput: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.text,
    },
    modalRow: {
        flexDirection: 'row',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalBtnSave: {
        backgroundColor: Colors.primary,
    },
    modalBtnCancelText: {
        color: Colors.text,
        fontWeight: '600',
        fontSize: 15,
    },
    modalBtnSaveText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
});
