import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface Props {
    children: React.ReactNode;
}

export function LiquidBackground({ children }: Props) {
    const [driftY] = useState(() => new Animated.Value(0));
    const [driftX] = useState(() => new Animated.Value(0));
    const [reduceMotion, setReduceMotion] = useState(() =>
        Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false
    );

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            const onChange = () => setReduceMotion(mq.matches);
            onChange();
            if (mq.addEventListener) mq.addEventListener('change', onChange);
            return () => {
                if (mq.removeEventListener) mq.removeEventListener('change', onChange);
            };
        }

        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (mounted) setReduceMotion(Boolean(enabled));
            })
            .catch(() => {});

        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled: boolean) => {
            setReduceMotion(Boolean(enabled));
        });

        return () => {
            mounted = false;
            sub.remove();
        };
    }, []);

    useEffect(() => {
        if (reduceMotion) {
            driftY.setValue(0);
            driftX.setValue(0);
            return;
        }

        const animY = Animated.loop(
            Animated.sequence([
                Animated.timing(driftY, {
                    toValue: 18,
                    duration: 14000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(driftY, {
                    toValue: 0,
                    duration: 14000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        const animX = Animated.loop(
            Animated.sequence([
                Animated.timing(driftX, {
                    toValue: 14,
                    duration: 16000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(driftX, {
                    toValue: 0,
                    duration: 16000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        animY.start();
        animX.start();

        return () => {
            driftY.stopAnimation();
            driftX.stopAnimation();
        };
    }, [reduceMotion, driftY, driftX]);

    const animatedWashStyle = {
        transform: [{ translateY: driftY }, { translateX: driftX }],
    };

    return (
        <View style={styles.container}>
            {/* Clean Alabaster base canvas */}
            <LinearGradient
                colors={['#F3F5F9', '#EEF2F8', '#F3F5F9']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Smooth radial ambient color washes (no hard circle edges on Android/iOS/Web) */}
            <Animated.View pointerEvents="none" style={[styles.ambientCanvas, animatedWashStyle]}>
                <Svg
                    width={width + 80}
                    height={height + 80}
                    viewBox="0 0 400 840"
                    preserveAspectRatio="none"
                    style={styles.svgFill}
                >
                    <Defs>
                        <RadialGradient id="topSapphireWash" cx="18%" cy="8%" r="55%">
                            <Stop offset="0%" stopColor="#93C5FD" stopOpacity="0.26" />
                            <Stop offset="45%" stopColor="#BFDBFE" stopOpacity="0.10" />
                            <Stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="topGoldWash" cx="88%" cy="10%" r="48%">
                            <Stop offset="0%" stopColor="#FDE68A" stopOpacity="0.22" />
                            <Stop offset="45%" stopColor="#FEF3C7" stopOpacity="0.08" />
                            <Stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="dockSapphireGlow" cx="22%" cy="94%" r="50%">
                            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.26" />
                            <Stop offset="42%" stopColor="#60A5FA" stopOpacity="0.11" />
                            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="dockGoldGlow" cx="80%" cy="95%" r="46%">
                            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.20" />
                            <Stop offset="42%" stopColor="#FBBF24" stopOpacity="0.08" />
                            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="400" height="840" fill="url(#topSapphireWash)" />
                    <Rect x="0" y="0" width="400" height="840" fill="url(#topGoldWash)" />
                    <Rect x="0" y="0" width="400" height="840" fill="url(#dockSapphireGlow)" />
                    <Rect x="0" y="0" width="400" height="840" fill="url(#dockGoldGlow)" />
                </Svg>
            </Animated.View>

            {/* Screen Content */}
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    ambientCanvas: {
        position: 'absolute',
        top: -40,
        left: -40,
        right: -40,
        bottom: -40,
    },
    svgFill: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
});
