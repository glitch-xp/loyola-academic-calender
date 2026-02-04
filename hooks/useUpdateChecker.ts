import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export function useUpdateChecker() {
    useEffect(() => {
        async function checkUpdates() {
            try {
                if (__DEV__) {
                    // Updates are not supported in development
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
                }
            } catch (error) {
                // Silently fail or log error in production
                console.error('Error checking for updates:', error);
            }
        }

        checkUpdates();
    }, []);
}
