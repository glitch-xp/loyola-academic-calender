import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { Colors } from '../constants/Colors';
import { Skeleton } from '../components/ui/Skeleton';

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
                <Skeleton width={80} height={80} borderRadius={40} />
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
