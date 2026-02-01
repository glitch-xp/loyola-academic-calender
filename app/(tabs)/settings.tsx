import { View, Text, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { StorageService } from '../../services/StorageService';
import { router } from 'expo-router';

export default function SettingsScreen() {

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

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.section}>
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
                </View>

                <View style={styles.footer}>
                    <Text style={styles.version}>Version 1.0.0</Text>
                    <Text style={styles.branding}>Loyola Time Table App</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    content: {
        padding: 20,
        flex: 1,
    },
    section: {
        backgroundColor: Colors.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 2,
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
        marginTop: 'auto',
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
    }

});
