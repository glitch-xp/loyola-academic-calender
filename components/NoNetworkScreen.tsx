import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Button } from './Button';
import { Card } from './Card';
import { LiquidBackground } from './LiquidBackground';
import { WifiOffIcon } from './ui/GlassIcons';

interface Props {
    onRetry?: () => void;
    message?: string;
}

export function NoNetworkScreen({ onRetry, message }: Props) {
    return (
        <LiquidBackground>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                <View style={styles.content}>
                    <Card style={styles.card}>
                        <View style={styles.iconContainer}>
                            <View style={styles.iconCircle}>
                                <WifiOffIcon size={40} color={Colors.primary} />
                            </View>
                        </View>

                        <Text style={styles.title}>No Internet Connection</Text>

                        <Text style={styles.message}>
                            {message || 'Please check your internet connection and try again.'}
                        </Text>

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

                    <Text style={styles.helpText}>
                        Make sure you&apos;re connected to Wi-Fi or mobile data
                    </Text>
                </View>
            </SafeAreaView>
        </LiquidBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 110,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        paddingVertical: 32,
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.highlight,
        borderWidth: 1,
        borderColor: 'rgba(15, 82, 186, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
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
