import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';

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
        // iOS Shadows for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        // Android Elevation
        elevation: 5,
        marginBottom: 16,
        overflow: Platform.OS === 'android' ? 'hidden' : 'visible', // Visible for shadows on iOS, hidden for borderRadius on Android
    },
    blurContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // Glass bezel
    },
    content: {
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.5)', // Default subtle white tint
    }
});
