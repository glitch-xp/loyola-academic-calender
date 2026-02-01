import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';

interface Props {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, style, textStyle, disabled }: Props) {
    const getBackgroundColor = () => {
        if (disabled) return '#E5E7EB'; // Gray-200
        if (variant === 'primary') return Colors.primary;
        if (variant === 'secondary') return Colors.secondary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return '#9CA3AF'; // Gray-400
        if (variant === 'primary') return '#FFFFFF';
        if (variant === 'secondary') return Colors.text;
        return Colors.primary;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.outline,
                style,
                (variant === 'primary' || variant === 'secondary') && !disabled && styles.shadow
            ]}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16, // Soft rounded corners
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    outline: {
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    shadow: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    }
});
