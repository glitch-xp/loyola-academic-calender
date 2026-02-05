import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface Props {
    children: React.ReactNode;
}

export function LiquidBackground({ children }: Props) {
    // Blob animations using standard Animated API
    const blob1Y = useRef(new Animated.Value(0)).current;
    const blob1X = useRef(new Animated.Value(0)).current;
    const blob2Y = useRef(new Animated.Value(0)).current;
    const blob2X = useRef(new Animated.Value(0)).current;
    const blob3Y = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (
            value: Animated.Value,
            toValue: number,
            duration: number
        ) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(value, {
                        toValue,
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0, // Return to start
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            );
        };

        const anim1Y = createAnimation(blob1Y, 100, 10000);
        const anim1X = createAnimation(blob1X, 50, 12000);
        const anim2Y = createAnimation(blob2Y, -80, 15000);
        const anim2X = createAnimation(blob2X, -50, 13000);
        const anim3Y = createAnimation(blob3Y, 60, 18000);

        anim1Y.start();
        anim1X.start();
        anim2Y.start();
        anim2X.start();
        anim3Y.start();

        return () => {
            blob1Y.stopAnimation();
            blob1X.stopAnimation();
            blob2Y.stopAnimation();
            blob2X.stopAnimation();
            blob3Y.stopAnimation();
        };
    }, []);

    const animatedStyle1 = {
        transform: [{ translateY: blob1Y }, { translateX: blob1X }],
    };

    const animatedStyle2 = {
        transform: [{ translateY: blob2Y }, { translateX: blob2X }],
    };

    const animatedStyle3 = {
        transform: [{ translateY: blob3Y }],
    };

    return (
        <View style={styles.container}>
            {/* Base Gradient - Lighter/Cleaner for academic app */}
            <LinearGradient
                colors={['#F0F4FF', '#E5E9F5', '#FFFFFF']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Animated Orbs/Blobs */}
            {/* Primary Blue Blob - Top Right */}
            <Animated.View style={[styles.blob, styles.blob1, animatedStyle1]} />

            {/* Secondary Gold Blob - Bottom Left */}
            <Animated.View style={[styles.blob, styles.blob2, animatedStyle2]} />

            {/* Accent Light Blue Blob - Center/Top */}
            <Animated.View style={[styles.blob, styles.blob3, animatedStyle3]} />

            {/* Content Overlay */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.6,
        // filter: 'blur(60px)', // removed as it is not supported in native properly
    },
    blob1: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: '#C8D9FF', // Light Blue
        top: -width * 0.2,
        right: -width * 0.2,
        shadowColor: '#4A90E2',
        shadowOpacity: 0.4,
        shadowRadius: 60,
        elevation: 10,
    },
    blob2: {
        width: width * 0.7,
        height: width * 0.7,
        backgroundColor: '#FFE8CC', // Light Gold
        bottom: height * 0.1,
        left: -width * 0.2,
        shadowColor: '#F59E0B',
        shadowOpacity: 0.3,
        shadowRadius: 50,
        elevation: 10,
    },
    blob3: {
        width: width * 0.6,
        height: width * 0.6,
        backgroundColor: '#E0F2FE', // Very Light Cyan
        top: height * 0.3,
        right: -width * 0.1,
        opacity: 0.4,
    }
});
