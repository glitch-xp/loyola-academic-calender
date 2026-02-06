import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X, Share, PlusSquare } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

export default function AddToHomeScreen() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Check if we are running in a browser environment
        if (typeof window === 'undefined') return;

        const checkDismissal = () => {
            const dismissed = localStorage.getItem('pwaPromptDismissed');
            if (dismissed) {
                const dismissedTime = parseInt(dismissed, 10);
                const now = Date.now();
                // If dismissed less than 1 hour ago, don't show (reduced from 3 days for testing)
                if (now - dismissedTime < 1 * 60 * 60 * 1000) {
                    return true;
                }
            }
            return false;
        };

        if (checkDismissal()) return;

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isStandalone) {
            return;
        }

        if (isIosDevice) {
            // Show for iOS users who are not in standalone mode
            // You might want to delay this or show it based on some user interaction to be less intrusive
            // For now, we show it after a short delay
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        } else {
            const handler = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsVisible(true);
            };
            window.addEventListener('beforeinstallprompt', handler);
            return () => window.removeEventListener('beforeinstallprompt', handler);
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
                localStorage.setItem('pwaPromptDismissed', Date.now().toString());
            }
            setDeferredPrompt(null);
        }
    };

    if (!isVisible) return null;

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                    <View style={styles.content}>
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>Install App</Text>
                            <Text style={styles.subtitle}>
                                {isIOS
                                    ? "Tap the Share button and select 'Add to Home Screen'"
                                    : "Install this app on your device for a better experience"}
                            </Text>
                        </View>
                        {!isIOS && (
                            <TouchableOpacity style={styles.button} onPress={handleInstallClick}>
                                <Text style={styles.buttonText}>Install</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={() => {
                        setIsVisible(false);
                        localStorage.setItem('pwaPromptDismissed', Date.now().toString());
                    }}>
                        <X size={20} color="#fff" />
                    </TouchableOpacity>

                    {isIOS && (
                        <View style={styles.iosInstructions}>
                            <View style={styles.iconInstruction}>
                                <Share size={20} color="#fff" />
                                <Text style={styles.instructionText}>Share</Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
                            <View style={styles.iconInstruction}>
                                <PlusSquare size={20} color="#fff" />
                                <Text style={styles.instructionText}>Add to Home Screen</Text>
                            </View>
                        </View>
                    )}
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        width: '90%',
        maxWidth: 500,
        borderRadius: 16,
        overflow: 'hidden',
        // shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    blurContainer: {
        padding: 16,
        backgroundColor: 'rgba(30, 30, 30, 0.85)', // Slightly more opaque for better readability
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 20,
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginBottom: 4,
    },
    subtitle: {
        color: '#ccc',
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },
    button: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    buttonText: {
        color: '#000',
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 4,
        zIndex: 10,
    },
    iosInstructions: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    iconInstruction: {
        alignItems: 'center',
        gap: 4
    },
    instructionText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Poppins_400Regular',
    },
    arrow: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    }
});
