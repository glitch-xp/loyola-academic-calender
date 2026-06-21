import { useEffect, useState } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { DataService } from '../services/DataService';

interface UpdateInfo {
    isUpdateAvailable: boolean;
    version: string | null;
    releaseNotes: string | null;
    downloadUrl: string | null;
}

export function useUpdateChecker({ autoCheck = true }: { autoCheck?: boolean } = {}) {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (autoCheck && Platform.OS !== 'web') {
            checkUpdates(false);
        }
    }, [autoCheck]);

    const checkUpdates = async (manual: boolean = false) => {
        // Updates are only relevant on native (Android)
        if (Platform.OS === 'web') {
            return;
        }

        if (__DEV__) {
            if (manual) Alert.alert('Development', 'Updates are not supported in development mode.');
            return;
        }

        setChecking(true);

        try {
            const currentVersion = Constants.expoConfig?.version || '0.0.0';
            const result = await DataService.checkForUpdate(currentVersion, Platform.OS);

            setUpdateInfo(result);

            if (result.isUpdateAvailable && result.version) {
                Alert.alert(
                    `Update Available (v${result.version})`,
                    result.releaseNotes || 'A new version of the app is available.',
                    [
                        {
                            text: 'Later',
                            style: 'cancel',
                        },
                        {
                            text: 'Download',
                            onPress: () => {
                                if (result.downloadUrl) {
                                    Linking.openURL(result.downloadUrl);
                                }
                            },
                        },
                    ]
                );
            } else {
                if (manual) {
                    Alert.alert('Up to Date', 'You are using the latest version of the app.');
                }
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            if (manual) {
                Alert.alert('Error', 'Failed to check for updates. Please check your internet connection.');
            }
        } finally {
            setChecking(false);
        }
    };

    return { checkUpdates, updateInfo, checking };
}
