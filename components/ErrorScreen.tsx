import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
    onRetry?: () => void;
    title?: string;
    message?: string;
}

export function ErrorScreen({ onRetry, title, message }: Props) {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.content}>
                <Card style={styles.card}>
                    {/* Error Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Text style={styles.iconText}>⚠️</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>
                        {title || 'Something Went Wrong'}
                    </Text>

                    {/* Message */}
                    <Text style={styles.message}>
                        {message || 'We encountered an unexpected error. Please try again.'}
                    </Text>

                    {/* Retry Button */}
                    {onRetry && (
                        <View style={styles.buttonContainer}>
                            <Button
                                title="Try Again"
                                onPress={onRetry}
                                variant="primary"
                            />
                        </View>
                    )}
                </Card>

                {/* Additional Help Text */}
                <Text style={styles.helpText}>
                    If the problem persists, please contact support
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 40,
    },
    iconContainer: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 300,
    },
    helpText: {
        fontSize: 14,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
});
