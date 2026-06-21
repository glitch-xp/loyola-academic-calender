import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { StorageService } from '@/services/StorageService';
import { DataService, DataFetchError, NetworkError } from '@/services/DataService';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Subject, TimeTable, UserProfile, MasterConfig } from '@/types';

const DAYS = [1, 2, 3, 4, 5, 6];
const PERIODS = [1, 2, 3, 4, 5];
const LOCAL_TT_KEY = 'custom_timetable';

interface EditableEntry {
    name: string;
    code: string;
    room: string;
    teacher: string;
}

type EditableGrid = Record<number, EditableEntry[]>;

function createEmptyGrid(): EditableGrid {
    const grid: EditableGrid = {};
    for (const d of DAYS) {
        grid[d] = PERIODS.map(() => ({ name: '', code: '', room: '', teacher: '' }));
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
                room: subjects[p].room || '',
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
            ...(e.room.trim() ? { room: e.room.trim() } : {}),
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
    const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await StorageService.getUserProfile();
            setUserProfile(profile);

            const config = await StorageService.getData<MasterConfig>('master_config');
            setMasterConfig(config);

            // Check for local custom timetable first
            const customTT = await StorageService.getData<TimeTable>(LOCAL_TT_KEY);
            if (customTT) {
                setGrid(timetableToGrid(customTT));
                setIsCustom(true);
            } else {
                // Fall back to server timetable
                const serverTT = await StorageService.getData<TimeTable>('timetable');
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
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
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
                            {isCustom ? 'Using your custom timetable' : 'Using server timetable'}
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
                                {isCustom ? '✏️ Custom' : '☁️ Server'}
                            </Text>
                        </View>
                        {isCustom && (
                            <TouchableOpacity onPress={handleResetToServer} style={styles.resetLink}>
                                <Text style={styles.resetLinkText}>Reset to server</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Timetable Grid */}
                    <Card style={styles.gridCard}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                                {/* Header row */}
                                <View style={styles.gridRow}>
                                    <View style={[styles.gridCell, styles.cornerCell]}>
                                        <Text style={styles.headerText}>Day</Text>
                                    </View>
                                    {PERIODS.map(p => (
                                        <View key={p} style={[styles.gridCell, styles.headerCell]}>
                                            <Text style={styles.headerText}>P{p}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Day rows */}
                                {DAYS.map(day => (
                                    <View key={day} style={styles.gridRow}>
                                        <View style={[styles.gridCell, styles.dayLabelCell]}>
                                            <Text style={styles.dayLabelText}>Day {day}</Text>
                                        </View>
                                        {PERIODS.map((_, pIdx) => {
                                            const entry = grid[day][pIdx];
                                            const isEditing = editingCell?.day === day && editingCell?.period === pIdx;
                                            return (
                                                <TouchableOpacity
                                                    key={pIdx}
                                                    style={[styles.gridCell, styles.dataCell, isEditing && styles.dataCellEditing]}
                                                    onPress={() => setEditingCell(isEditing ? null : { day, period: pIdx })}
                                                    activeOpacity={0.7}
                                                >
                                                    {isEditing ? (
                                                        <View style={styles.editFields}>
                                                            <TextInput
                                                                style={styles.cellInput}
                                                                placeholder="Subject"
                                                                placeholderTextColor={Colors.textLight}
                                                                value={entry.name}
                                                                onChangeText={v => updateCell(day, pIdx, 'name', v)}
                                                                maxLength={100}
                                                                autoFocus
                                                            />
                                                            <TextInput
                                                                style={[styles.cellInput, styles.cellInputSmall]}
                                                                placeholder="Code"
                                                                placeholderTextColor={Colors.textLight}
                                                                value={entry.code}
                                                                onChangeText={v => updateCell(day, pIdx, 'code', v)}
                                                                maxLength={20}
                                                            />
                                                            <View style={styles.cellInputRow}>
                                                                <TextInput
                                                                    style={[styles.cellInput, styles.cellInputSmall, { flex: 1 }]}
                                                                    placeholder="Room"
                                                                    placeholderTextColor={Colors.textLight}
                                                                    value={entry.room}
                                                                    onChangeText={v => updateCell(day, pIdx, 'room', v)}
                                                                    maxLength={20}
                                                                />
                                                                <TextInput
                                                                    style={[styles.cellInput, styles.cellInputSmall, { flex: 1 }]}
                                                                    placeholder="Teacher"
                                                                    placeholderTextColor={Colors.textLight}
                                                                    value={entry.teacher}
                                                                    onChangeText={v => updateCell(day, pIdx, 'teacher', v)}
                                                                    maxLength={50}
                                                                />
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View>
                                                            {entry.name ? (
                                                                <>
                                                                    <Text style={styles.cellSubjectName} numberOfLines={2}>{entry.name}</Text>
                                                                    {entry.code ? <Text style={styles.cellSubjectCode}>{entry.code}</Text> : null}
                                                                    {entry.room || entry.teacher ? (
                                                                        <Text style={styles.cellMeta} numberOfLines={1}>
                                                                            {entry.room}{entry.room && entry.teacher ? ' · ' : ''}{entry.teacher}
                                                                        </Text>
                                                                    ) : null}
                                                                </>
                                                            ) : (
                                                                <Text style={styles.cellPlaceholder}>+</Text>
                                                            )}
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Card>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <Button
                            title={saving ? 'Saving...' : 'Save Locally'}
                            onPress={handleSaveLocally}
                            variant="primary"
                            loading={saving}
                            style={{ marginBottom: 12 }}
                        />

                        {!showContributeForm ? (
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
    gridCard: {
        padding: 0,
        overflow: 'hidden',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridCell: {
        borderWidth: 0.5,
        borderColor: Colors.border,
    },
    cornerCell: {
        width: 56,
        padding: 10,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCell: {
        width: 110,
        padding: 10,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dayLabelCell: {
        width: 56,
        padding: 10,
        backgroundColor: Colors.highlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
    },
    dataCell: {
        width: 110,
        minHeight: 70,
        padding: 8,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
    },
    dataCellEditing: {
        backgroundColor: '#EEF2FF',
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    editFields: {
        gap: 4,
    },
    cellInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 4,
        fontSize: 12,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cellInputSmall: {
        fontSize: 11,
        paddingVertical: 3,
    },
    cellInputRow: {
        flexDirection: 'row',
        gap: 4,
    },
    cellSubjectName: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 16,
    },
    cellSubjectCode: {
        fontSize: 10,
        color: Colors.primary,
        marginTop: 2,
    },
    cellMeta: {
        fontSize: 9,
        color: Colors.textLight,
        marginTop: 2,
    },
    cellPlaceholder: {
        fontSize: 18,
        color: Colors.border,
        textAlign: 'center',
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
});
