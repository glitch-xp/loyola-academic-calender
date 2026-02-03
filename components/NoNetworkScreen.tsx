import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
    onRetry?: () => void;
    message?: string;
}

export function NoNetworkScreen({ onRetry, message }: Props) {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.content}>
                <Card style={styles.card}>
                    {/* Network Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Text style={styles.iconText}>📡</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>No Internet Connection</Text>

                    {/* Message */}
                    <Text style={styles.message}>
                        {message || 'Please check your internet connection and try again.'}
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
                    Make sure you&apos;re connected to Wi-Fi or mobile data
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
        backgroundColor: Colors.highlight,
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
