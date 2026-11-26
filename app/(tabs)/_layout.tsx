import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Navigator } from 'expo-router';
import { Tabs, TabList, TabTrigger } from 'expo-router/ui';
import { BlurTargetView } from 'expo-blur';
import { TabBar } from '../../components/ui/TabBar';

function TabScenes() {
    const { state, descriptors } = Navigator.useContext();

    return (
        <View style={styles.scenesWrap}>
            {state.routes.map((route, index) => {
                if (Platform.OS === 'web' && route.name === 'attendance') {
                    return null;
                }
                const isFocused = state.index === index;
                return (
                    <View
                        key={route.key}
                        pointerEvents={isFocused ? 'auto' : 'none'}
                        style={[
                            StyleSheet.absoluteFill,
                            { display: isFocused ? 'flex' : 'none' },
                        ]}
                    >
                        {descriptors[route.key]?.render()}
                    </View>
                );
            })}
        </View>
    );
}

export default function TabLayout() {
    const screenBlurRef = useRef<React.ComponentRef<typeof View> | null>(null);
    const [blurTargetReady, setBlurTargetReady] = useState(false);

    return (
        <Tabs style={styles.root}>
            {/* Single static BlurTargetView on Android strictly outside TabBar so blur never recurses or detaches */}
            {Platform.OS === 'android' ? (
                <BlurTargetView
                    ref={screenBlurRef}
                    collapsable={false}
                    onLayout={(e) => {
                        if (e.nativeEvent.layout.width > 0 && !blurTargetReady) {
                            setBlurTargetReady(true);
                        }
                    }}
                    style={styles.slotHost}
                >
                    <TabScenes />
                </BlurTargetView>
            ) : (
                <View style={styles.slotHost}>
                    <TabScenes />
                </View>
            )}

            {/* Route registry triggers for expo-router/ui headless Tabs */}
            <TabList style={styles.hiddenTriggers}>
                <TabTrigger name="home" href="/(tabs)/home" />
                <TabTrigger name="timetable" href="/(tabs)/timetable" />
                {Platform.OS !== 'web' && <TabTrigger name="attendance" href="/(tabs)/attendance" />}
                <TabTrigger name="calendar" href="/(tabs)/calendar" />
                <TabTrigger name="settings" href="/(tabs)/settings" />
            </TabList>

            {/* Floating Liquid Glass Tab Dock rendered strictly outside BlurTargetView */}
            <TabBar blurTarget={blurTargetReady ? screenBlurRef : undefined} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        width: '100%',
    },
    slotHost: {
        flex: 1,
        width: '100%',
    },
    scenesWrap: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    hiddenTriggers: {
        display: 'none',
    },
});
