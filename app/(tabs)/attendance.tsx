import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect } from 'expo-router';
import {
    ClockCircleIcon,
    SquareTopDownIcon,
    EyeIcon,
    EyeClosedIcon,
    LockKeyholeIcon,
    RefreshIcon,
    RestartIcon,
    TrashBinMinimalisticIcon,
    CloseCircleIcon,
} from '@/components/ui/GlassIcons';
import { Colors } from '@/constants/Colors';
import { LiquidBackground } from '@/components/LiquidBackground';
import { LiquidGlassSurface } from '@/components/ui/LiquidGlassSurface';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { AttendanceData } from '@/types';
import {
    AttendanceService,
    buildLoginSubmitJS,
    ERP_URLS,
    formatSubjectTitle,
    getAttendanceTheme,
    REFRESH_COOLDOWN_MS,
    WEBVIEW_BEFORE_CONTENT_JS,
    WEBVIEW_INSPECT_PAGE_JS,
} from '@/services/AttendanceService';

type SyncStep = 'idle' | 'checking' | 'awaiting_login' | 'submitting' | 'fetching_report';

const NativeWebView: React.ComponentType<any> | null =
    Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

export default function AttendanceScreen() {
    const [attendance, setAttendance] = useState<AttendanceData | null>(null);
    const [isCacheExpired, setIsCacheExpired] = useState(true);
    const [expiresInMs, setExpiresInMs] = useState(0);
    const [loadingCache, setLoadingCache] = useState(true);

    // On-device ERP sync state
    const [syncStep, setSyncStep] = useState<SyncStep>('idle');
    const [webViewUri, setWebViewUri] = useState<string>(ERP_URLS.attendance);
    const [webViewKey, setWebViewKey] = useState(0);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Clean native Login + Captcha modal state
    const [deptNo, setDeptNo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberCreds, setRememberCreds] = useState(true);
    const [hasSavedCreds, setHasSavedCreds] = useState(false);
    const [captchaText, setCaptchaText] = useState('');
    const [captchaImgSrc, setCaptchaImgSrc] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [modalError, setModalError] = useState<string | null>(null);

    const webViewRef = useRef<any>(null);
    const lastAttemptRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncStepRef = useRef<SyncStep>('idle');
    useEffect(() => {
        syncStepRef.current = syncStep;
    }, [syncStep]);

    const clearSyncTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const startSyncTimeout = () => {
        clearSyncTimeout();
        timeoutRef.current = setTimeout(() => {
            if (syncStepRef.current !== 'idle' && syncStepRef.current !== 'awaiting_login') {
                setSyncStep('idle');
                setSyncError('ERP portal timed out. Please check your internet connection and try again.');
            }
        }, 25000);
    };

    const loadLocalState = useCallback(async () => {
        try {
            const [cacheResult, savedCreds] = await Promise.all([
                AttendanceService.getCachedAttendance(),
                AttendanceService.getCredentials(),
            ]);
            setAttendance(cacheResult.data);
            setIsCacheExpired(cacheResult.isExpired);
            setExpiresInMs(cacheResult.expiresInMs);
            if (savedCreds) {
                setDeptNo(savedCreds.deptNo);
                setPassword(savedCreds.password);
                setHasSavedCreds(true);
            } else {
                setHasSavedCreds(false);
            }
        } catch (err) {
            console.error('Failed to load attendance cache:', err);
        } finally {
            setLoadingCache(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadLocalState();
            return () => {
                clearSyncTimeout();
            };
        }, [loadLocalState])
    );

    // Update cache expiration display every minute while screen is active
    useEffect(() => {
        const timer = setInterval(() => {
            if (attendance?.fetchedAt) {
                const age = Date.now() - attendance.fetchedAt;
                const remaining = Math.max(0, 2 * 60 * 60 * 1000 - age);
                setExpiresInMs(remaining);
                setIsCacheExpired(remaining <= 0);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [attendance]);

    const beginSync = () => {
        if (Platform.OS === 'web') return;

        const now = Date.now();
        if (now - lastAttemptRef.current < REFRESH_COOLDOWN_MS) {
            setSyncError('Please wait a few seconds before refreshing again.');
            return;
        }
        lastAttemptRef.current = now;

        setSyncError(null);
        setModalError(null);
        setCaptchaInput('');
        setCaptchaText('');
        setCaptchaImgSrc('');
        setWebViewUri(ERP_URLS.attendance);
        setWebViewKey(prev => prev + 1);
        setSyncStep('checking');
        startSyncTimeout();
    };

    const cancelSync = () => {
        clearSyncTimeout();
        setSyncStep('idle');
        setModalError(null);
        setCaptchaInput('');
    };

    const reloadCaptcha = () => {
        setModalError(null);
        setCaptchaInput('');
        setCaptchaText('');
        setCaptchaImgSrc('');
        setWebViewUri(ERP_URLS.login);
        setWebViewKey(prev => prev + 1);
        setSyncStep('checking');
        startSyncTimeout();
    };

    const handleSubmitLogin = () => {
        const cleanId = deptNo.trim();
        const cleanCaptcha = captchaInput.trim();

        if (!cleanId) {
            setModalError('Enter your Department Number (e.g. 25-UCC-016).');
            return;
        }
        if (!password) {
            setModalError('Enter your ERP password.');
            return;
        }
        if (!cleanCaptcha) {
            setModalError('Enter the Captcha shown above.');
            return;
        }

        setModalError(null);
        setSyncStep('submitting');
        startSyncTimeout();
        webViewRef.current?.injectJavaScript(buildLoginSubmitJS(cleanId, password, cleanCaptcha));
    };

    const handleWebViewMessage = async (event: any) => {
        let msg: any;
        try {
            msg = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }

        if (msg.type === 'ERP_ALERT') {
            if (syncStepRef.current === 'submitting' && msg.message) {
                setModalError(msg.message);
            }
            return;
        }

        if (msg.type === 'ATTENDANCE_DATA') {
            clearSyncTimeout();
            const parsed: AttendanceData = msg.data;

            if (rememberCreds && deptNo.trim() && password) {
                await AttendanceService.saveCredentials(deptNo, password);
                setHasSavedCreds(true);
            } else if (!rememberCreds) {
                await AttendanceService.clearCredentials();
                setHasSavedCreds(false);
            }

            await AttendanceService.saveAttendanceCache(parsed);
            setAttendance(parsed);
            setIsCacheExpired(false);
            setExpiresInMs(2 * 60 * 60 * 1000);
            setSyncStep('idle');
            setSyncError(null);
            setModalError(null);
            setCaptchaInput('');
            return;
        }

        if (msg.type === 'LOGIN_REQUIRED') {
            clearSyncTimeout();
            const wasSubmitting = syncStepRef.current === 'submitting';
            setCaptchaText(msg.captchaText || '');
            setCaptchaImgSrc(msg.captchaImgSrc || '');
            setCaptchaInput('');

            if (wasSubmitting) {
                setModalError(
                    msg.alertMessage || 'Login failed. Please check your ID, password, and Captcha.'
                );
            }
            setSyncStep('awaiting_login');
            return;
        }

        if (msg.type === 'LOGGED_IN') {
            setSyncStep('fetching_report');
            startSyncTimeout();
            setWebViewUri(ERP_URLS.attendance);
            setWebViewKey(prev => prev + 1);
            return;
        }

        if (msg.type === 'PARSE_ERROR' || msg.type === 'LOGIN_FORM_MISSING') {
            clearSyncTimeout();
            setSyncStep('idle');
            setSyncError(msg.message || 'Could not read ERP page format. Try opening the portal directly.');
            return;
        }

        if (msg.type === 'UNKNOWN_PAGE' && syncStepRef.current === 'submitting') {
            // Some ERP responses return an intermediate page or error alert
            clearSyncTimeout();
            setSyncStep('awaiting_login');
            setModalError(msg.alertMessage || 'Unexpected ERP response. Please reload Captcha and try again.');
        }
    };

    const handleClearSavedData = () => {
        Alert.alert(
            'Clear ERP Data',
            'This will remove your saved ERP credentials and cached attendance from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await Promise.all([
                            AttendanceService.clearCredentials(),
                            AttendanceService.clearAttendanceCache(),
                        ]);
                        setAttendance(null);
                        setIsCacheExpired(true);
                        setExpiresInMs(0);
                        setDeptNo('');
                        setPassword('');
                        setHasSavedCreds(false);
                        setSyncError(null);
                    },
                },
            ]
        );
    };

    const overallTheme = attendance ? getAttendanceTheme(attendance.overallPercentage) : null;
    const isSyncing = syncStep === 'checking' || syncStep === 'submitting' || syncStep === 'fetching_report';

    if (Platform.OS === 'web') {
        // @ts-ignore
        return <Redirect href="/(tabs)/home" />;
    }

    return (
        <LiquidBackground>
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={beginSync} />}
                >
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            <View>
                                <Text style={styles.title}>Attendance</Text>
                                <Text style={styles.subtitle}>Synced directly on your device</Text>
                            </View>
                            {(attendance || hasSavedCreds) && (
                                <TouchableOpacity
                                    onPress={handleClearSavedData}
                                    activeOpacity={0.75}
                                    accessibilityLabel="Clear saved ERP credentials and attendance cache"
                                >
                                    <LiquidGlassSurface
                                        interactive
                                        borderRadius={22}
                                        style={styles.iconActionBtn}
                                    >
                                        <TrashBinMinimalisticIcon size={19} color={Colors.primary} />
                                    </LiquidGlassSurface>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {syncError && (
                        <Card style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{syncError}</Text>
                        </Card>
                    )}

                            {/* Overall Attendance Card */}
                            {attendance && overallTheme ? (
                                <Card
                                    style={[
                                        styles.summaryCard,
                                        {
                                            backgroundColor: overallTheme.cardBg,
                                            borderColor: overallTheme.cardBorder,
                                            borderWidth: 1,
                                        },
                                    ]}
                                >
                                    <View style={styles.summaryTopRow}>
                                        <View style={styles.summaryMetricCol}>
                                            <Text style={[styles.summaryLabel, { color: overallTheme.text }]}>
                                                Overall Attendance
                                            </Text>
                                            <Text style={[styles.summaryPercent, { color: overallTheme.text }]}>
                                                {attendance.overallPercentage.toFixed(1)}%
                                            </Text>
                                            {(attendance.periodFrom || attendance.periodTo) && (
                                                <Text style={[styles.periodText, { color: overallTheme.text }]}>
                                                    {attendance.periodFrom} – {attendance.periodTo}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.hoursBox, { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: overallTheme.cardBorder }]}>
                                            <Text style={styles.hoursValue}>
                                                {attendance.presentHours}/{attendance.totalHours}
                                            </Text>
                                            <Text style={styles.hoursLabel}>Hours Present</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                {
                                                    width: `${Math.min(100, Math.max(0, attendance.overallPercentage))}%`,
                                                    backgroundColor: overallTheme.accent,
                                                },
                                            ]}
                                        />
                                    </View>

                                    <View style={styles.summaryFooterRow}>
                                        <View style={styles.cacheStatusPill}>
                                            <ClockCircleIcon size={13} color={isCacheExpired ? '#B45309' : overallTheme.text} />
                                            <Text
                                                style={[
                                                    styles.cacheStatusText,
                                                    { color: isCacheExpired ? '#B45309' : overallTheme.text },
                                                ]}
                                            >
                                                {isCacheExpired
                                                    ? 'Cache expired'
                                                    : `Expires in ${AttendanceService.formatDuration(expiresInMs)}`}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.refreshBtn, isSyncing && styles.btnDisabled]}
                                            onPress={beginSync}
                                            disabled={isSyncing}
                                            activeOpacity={0.8}
                                        >
                                            {isSyncing ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <RefreshIcon size={16} color="#FFFFFF" />
                                            )}
                                            <Text style={styles.refreshBtnText}>
                                                {isSyncing ? 'Syncing...' : 'Refresh Attendance'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            ) : !loadingCache ? (
                                <Card style={styles.emptyCard}>
                                    <LockKeyholeIcon size={32} color={Colors.primary} />
                                    <Text style={styles.emptyTitle}>Connect Loyola ERP</Text>
                                    <Text style={styles.emptyBody}>
                                        View your subject-wise attendance directly in the app. Your credentials are stored encrypted on this phone only, and synced attendance is cached locally for 2 hours.
                                    </Text>
                                    <Button
                                        title={isSyncing ? 'Connecting...' : 'Sync Attendance'}
                                        onPress={beginSync}
                                        loading={isSyncing}
                                        style={{ width: '100%', marginTop: 16 }}
                                    />
                                </Card>
                            ) : null}

                            {/* Subject-wise Breakdown */}
                            {attendance && attendance.subjects.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Subject Breakdown</Text>
                                    {attendance.subjects.map((sub, idx) => {
                                        const theme = getAttendanceTheme(sub.percentage);
                                        return (
                                            <Card
                                                key={`${sub.code}-${idx}`}
                                                style={[
                                                    styles.subjectCard,
                                                    {
                                                        backgroundColor: theme.cardBg,
                                                        borderColor: theme.cardBorder,
                                                        borderWidth: 1,
                                                    },
                                                ]}
                                            >
                                                <View style={styles.subjectTopRow}>
                                                    <View style={styles.subjectTitleCol}>
                                                        <Text style={styles.subjectName}>
                                                            {formatSubjectTitle(sub.name)}
                                                        </Text>
                                                        <Text style={[styles.subjectMeta, { color: theme.text }]}>
                                                            {sub.code} • {sub.presentHours}/{sub.totalHours} hrs
                                                            {sub.absentHours > 0 ? ` • ${sub.absentHours} absent` : ''}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.subjectPercentCol}>
                                                        <Text style={[styles.subjectPercent, { color: theme.text }]}>
                                                            {sub.percentage.toFixed(1)}%
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={[styles.subjectTrack, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                                                    <View
                                                        style={[
                                                            styles.subjectFill,
                                                            {
                                                                width: `${Math.min(100, Math.max(0, sub.percentage))}%`,
                                                                backgroundColor: theme.accent,
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                            </Card>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Direct Portal Fallback Link */}
                            <TouchableOpacity
                                style={styles.portalLinkRow}
                                onPress={() => Linking.openURL(ERP_URLS.login)}
                            >
                                <SquareTopDownIcon size={14} color={Colors.textLight} />
                                <Text style={styles.portalLinkText}>Open ERP in Browser</Text>
                            </TouchableOpacity>
                </ScrollView>

                {/* Off-screen WebView for direct device-to-ERP session & DOM read */}
                {NativeWebView && syncStep !== 'idle' && (
                    <View style={styles.hiddenWebViewWrap} pointerEvents="none">
                        <NativeWebView
                            key={webViewKey}
                            ref={webViewRef}
                            source={{ uri: webViewUri }}
                            javaScriptEnabled
                            domStorageEnabled
                            sharedCookiesEnabled
                            thirdPartyCookiesEnabled
                            injectedJavaScriptBeforeContentLoaded={WEBVIEW_BEFORE_CONTENT_JS}
                            injectedJavaScript={WEBVIEW_INSPECT_PAGE_JS}
                            onMessage={handleWebViewMessage}
                            onError={() => {
                                clearSyncTimeout();
                                setSyncStep('idle');
                                setSyncError('Unable to reach erp.loyolacollege.edu. Check your internet connection.');
                            }}
                            onRenderProcessGone={() => {
                                clearSyncTimeout();
                                setSyncStep('idle');
                                setSyncError('Portal view was reset by Android. Tap Refresh Attendance to retry.');
                            }}
                        />
                    </View>
                )}

                {/* Clean Native Login + User-Solved Captcha Modal */}
                <Modal
                    visible={syncStep === 'awaiting_login' || syncStep === 'submitting'}
                    transparent
                    animationType="slide"
                    onRequestClose={cancelSync}
                >
                    <KeyboardAvoidingView
                        style={styles.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Loyola ERP Login</Text>
                                    <Text style={styles.modalSubtitle}>
                                        Stays on your phone • Direct ERP session
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={cancelSync}
                                    style={styles.modalCloseBtn}
                                    accessibilityLabel="Close login modal"
                                >
                                    <CloseCircleIcon size={22} color={Colors.textLight} />
                                </TouchableOpacity>
                            </View>

                            {modalError && (
                                <View style={styles.modalErrorBox}>
                                    <Text style={styles.modalErrorText}>{modalError}</Text>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Department Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={deptNo}
                                    onChangeText={setDeptNo}
                                    placeholder="e.g. 25-UCC-016"
                                    placeholderTextColor={Colors.textLight}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={syncStep !== 'submitting'}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>ERP Password</Text>
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        style={[styles.input, styles.passwordInput]}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your password"
                                        placeholderTextColor={Colors.textLight}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={syncStep !== 'submitting'}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeBtn}
                                        onPress={() => setShowPassword(prev => !prev)}
                                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeClosedIcon size={18} color={Colors.textLight} />
                                        ) : (
                                            <EyeIcon size={18} color={Colors.textLight} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.captchaHeaderRow}>
                                    <Text style={styles.inputLabel}>Captcha Verification</Text>
                                    <TouchableOpacity
                                        onPress={reloadCaptcha}
                                        style={styles.reloadCaptchaBtn}
                                        disabled={syncStep === 'submitting'}
                                        accessibilityLabel="Reload captcha"
                                    >
                                        <RestartIcon size={14} color={Colors.primary} />
                                        <Text style={styles.reloadCaptchaText}>Reload</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.captchaChallengeBox}>
                                    {captchaImgSrc ? (
                                        <Image
                                            source={{ uri: captchaImgSrc }}
                                            style={styles.captchaImage}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Text style={styles.captchaChallengeText} selectable={false}>
                                            {captchaText || 'Loading Captcha...'}
                                        </Text>
                                    )}
                                </View>

                                <TextInput
                                    style={[styles.input, { marginTop: 10 }]}
                                    value={captchaInput}
                                    onChangeText={setCaptchaInput}
                                    placeholder="Type the captcha shown above"
                                    placeholderTextColor={Colors.textLight}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={syncStep !== 'submitting'}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmitLogin}
                                />
                            </View>

                            <View style={styles.rememberRow}>
                                <Text style={styles.rememberLabel}>
                                    Save credentials securely on this device
                                </Text>
                                <Switch
                                    value={rememberCreds}
                                    onValueChange={setRememberCreds}
                                    trackColor={{ false: Colors.border, true: Colors.primary }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>

                            <Button
                                title={syncStep === 'submitting' ? 'Signing In...' : 'Verify & Sync'}
                                onPress={handleSubmitLogin}
                                loading={syncStep === 'submitting'}
                                style={{ marginTop: 8 }}
                            />
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </LiquidBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    header: {
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
        marginTop: 2,
    },
    iconActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        marginBottom: 14,
    },
    errorBannerText: {
        color: '#B91C1C',
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    summaryCard: {
        marginBottom: 20,
    },
    summaryTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryMetricCol: {
        flex: 1,
        paddingRight: 12,
    },
    summaryLabel: {
        fontSize: 13.5,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.textLight,
    },
    summaryPercent: {
        fontSize: 36,
        fontFamily: 'Poppins_800ExtraBold',
        fontVariant: ['tabular-nums'],
        marginTop: 2,
    },
    periodText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
        marginTop: 2,
    },
    hoursBox: {
        backgroundColor: Colors.background,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    hoursValue: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        fontVariant: ['tabular-nums'],
    },
    hoursLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.border,
        overflow: 'hidden',
        marginTop: 14,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    summaryFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    marginText: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
    },
    cacheStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    cacheStatusText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
    },
    actionRow: {
        marginTop: 14,
    },
    refreshBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    refreshBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 22,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginTop: 12,
    },
    emptyBody: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 21,
        marginTop: 8,
    },
    section: {
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        marginBottom: 12,
    },
    subjectCard: {
        marginBottom: 12,
    },
    subjectTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    subjectTitleCol: {
        flex: 1,
    },
    subjectName: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        lineHeight: 21,
    },
    subjectMeta: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
        marginTop: 3,
        fontVariant: ['tabular-nums'],
    },
    subjectPercentCol: {
        alignItems: 'flex-end',
    },
    subjectPercent: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        fontVariant: ['tabular-nums'],
    },
    subjectTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
        overflow: 'hidden',
        marginTop: 10,
    },
    subjectFill: {
        height: '100%',
        borderRadius: 3,
    },
    subjectMarginText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        marginTop: 6,
    },
    portalLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 10,
    },
    portalLinkText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
    },
    hiddenWebViewWrap: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 22,
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
    },
    modalSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    modalErrorBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginBottom: 14,
    },
    modalErrorText: {
        color: '#B91C1C',
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        marginBottom: 6,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        color: Colors.text,
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        paddingRight: 44,
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captchaHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    reloadCaptchaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    reloadCaptchaText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.primary,
    },
    captchaChallengeBox: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
    },
    captchaChallengeText: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 4,
        color: '#0F172A',
    },
    captchaImage: {
        width: 160,
        height: 44,
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 12,
    },
    rememberLabel: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        color: Colors.textLight,
    },
});
