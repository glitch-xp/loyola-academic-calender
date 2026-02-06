import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

export function useUpdateChecker({ autoCheck = true }: { autoCheck?: boolean } = {}) {
    useEffect(() => {
        if (autoCheck) {
            checkUpdates(false);
        }
    }, [autoCheck]);

    const checkUpdates = async (manual: boolean = false) => {
        if (Platform.OS === 'web') {
            if (manual) Alert.alert('Not Available', 'OTA updates are not supported on web.');
            return;
        }

        try {
            if (__DEV__) {
                if (manual) Alert.alert('Development', 'Updates are not supported in development mode.');
                return;
            }

            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                Alert.alert(
                    'Update Available',
                    'A new version of the app is available. Would you like to update now?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Update',
                            onPress: async () => {
                                try {
                                    await Updates.fetchUpdateAsync();
                                    await Updates.reloadAsync();
                                } catch (error) {
                                    Alert.alert('Error', 'Failed to fetch update');
                                    console.error(error);
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
        }
    };

    return { checkUpdates };
}
