import { View, Text, StyleSheet, Alert, Share, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StorageService } from '../../services/StorageService';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { LiquidBackground } from '../../components/LiquidBackground';

export default function SettingsScreen() {
    const { checkUpdates } = useUpdateChecker({ autoCheck: false });

    const handleReset = () => {
        Alert.alert(
            'Reset App',
            'Are you sure you want to change your course? This will clear your current data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await StorageService.clearUser();
                        // @ts-ignore
                        router.replace('/welcome');
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Check out the Loyola Academic Calendar app along with the source code: https://github.com/glitch-xp/loyola-academic-calender',
                url: 'https://github.com/glitch-xp/loyola-academic-calender',
                title: 'Share App'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const appVersion = Constants.expoConfig?.version || '2.1.0';

    return (
        <LiquidBackground>
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>More</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* App Updates Section - Hidden on Web */}
                {Platform.OS !== 'web' && (
                    <Card style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>App Updates</Text>
                        <Text style={styles.infoText}>
                            Check for the latest version of the app and new features.
                        </Text>
                        <Button
                            title="Check for Updates"
                            variant="primary"
                            onPress={() => checkUpdates(true)}
                            style={{ marginTop: 12 }}
                        />
                    </Card>
                )}

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Course Management</Text>
                    <Text style={styles.infoText}>
                        Need to change your Department, Year, or Section? Resetting will take you back to the welcome screen.
                    </Text>
                    <Button
                        title="Reset Course Selection"
                        variant="outline"
                        onPress={handleReset}
                        textStyle={{ color: Colors.error }}
                        style={{ borderColor: Colors.error, marginTop: 12 }}
                    />
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>About & Support</Text>
                    <Text style={styles.infoText}>
                        Love the app? Share the source code with your friends or contribute to the project!
                    </Text>
                    <Button
                        title="Share GitHub Repository"
                        variant="secondary"
                        onPress={handleShare}
                        style={{ marginTop: 12 }}
                    />
                </Card>

                <View style={styles.footer}>
                    <Text style={styles.version}>Version {appVersion}</Text>
                    <Text style={styles.branding}>Loyola Time Table App</Text>
                    <Text style={styles.developer}>Developed with ❤️ by Yuvaraja.com</Text>
                </View>
            </ScrollView>
            </SafeAreaView>
        </LiquidBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120, // Add extra padding for the tab bar
    },
    sectionCard: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    infoText: {
        color: Colors.textLight,
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    version: {
        color: Colors.textLight,
        fontSize: 12,
    },
    branding: {
        color: Colors.primaryDark,
        fontWeight: '600',
        marginTop: 4,
    },
    developer: {
        color: Colors.textLight,
        fontSize: 14,
        marginTop: 4,
        fontWeight: '600',
        opacity: 0.8
    }
});
