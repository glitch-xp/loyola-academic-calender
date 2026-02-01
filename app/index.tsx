import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { Colors } from '../constants/Colors';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState(false);

    useEffect(() => {
        checkProfile();
    }, []);

    const checkProfile = async () => {
        const profile = await StorageService.getUserProfile();
        setHasProfile(!!profile);
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!hasProfile) {
        // @ts-ignore
        return <Redirect href="/welcome" />;
    }

    // @ts-ignore
    return <Redirect href="/(tabs)/home" />;
}
