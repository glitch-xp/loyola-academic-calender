import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Card({ children, style }: Props) {
    // Extract background color if present to use as tint or fallback
    const { backgroundColor, ...otherStyles } = (style || {}) as ViewStyle;

    return (
        <View style={[styles.containerShadow, style]}>
            <BlurView
                intensity={80}
                tint="light"
                style={[styles.blurContainer, backgroundColor ? { backgroundColor: 'transparent' } : undefined]}
            >
                {/* Radial Gradient Background for Whiter Center */}
                {!backgroundColor && (
                    <View style={StyleSheet.absoluteFill}>
                        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                            <Defs>
                                <RadialGradient
                                    id="grad"
                                    cx="50%"
                                    cy="50%"
                                    rx="80%"
                                    ry="80%"
                                    fx="50%"
                                    fy="50%"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <Stop offset="0" stopColor="white" stopOpacity="0.9" />
                                    <Stop offset="1" stopColor="white" stopOpacity="0.4" />
                                </RadialGradient>
                            </Defs>
                            <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
                        </Svg>
                    </View>
                )}

                {/* Optional overlay for extra tint if needed */}
                <View style={[styles.content, backgroundColor ? { backgroundColor: typeof backgroundColor === 'string' ? backgroundColor.replace('rgb', 'rgba').replace(')', ', 0.3)') : backgroundColor } : undefined]}>
                    {children}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    containerShadow: {
        borderRadius: 24,
        // Glow Effect
        shadowColor: Colors.primary, // Using primary color for the glow
        shadowOffset: { width: 0, height: 0 }, // Centered glow
        shadowOpacity: 0.15,
        shadowRadius: 20,
        // Android Elevation
        elevation: 5,
        marginBottom: 16,
        backgroundColor: 'transparent', // Ensure shadow is visible
    },
    blurContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)', // Slightly clearer bezel
    },
    content: {
        padding: 20,
        backgroundColor: 'transparent', // Let gradient show through
    }
});
