
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, LayoutChangeEvent, Animated, PanResponder } from 'react-native';
import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';
import { Home, Calendar, Menu } from 'lucide-react-native';

export function TabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
    const [layout, setLayout] = React.useState<{ width: number; x: number }[]>([]);

    // Initialize layout array
    useEffect(() => {
        setLayout(new Array(state.routes.length).fill({ width: 0, x: 0 }));
    }, [state.routes.length]);

    const handleLayout = (event: LayoutChangeEvent, index: number) => {
        const { width, x } = event.nativeEvent.layout;

        setLayout(prev => {
            const newLayout = [...prev];
            newLayout[index] = { width, x };
            return newLayout;
        });
    };

    // Prepare ranges for interpolation
    // Ensure we have layout data for all tabs before interpolating effectively
    const isLayoutReady = layout.length === state.routes.length && layout.every(l => l.width > 0);

    // Default ranges if layout isn't ready yet
    const inputRange = state.routes.map((_, i) => i);
    const outputRangeTranslateX = isLayoutReady
        ? layout.map(l => l.x + 10) // 10px offset
        : state.routes.map(() => 0);

    const animatedStyle = {
        transform: [{
            translateX: position.interpolate({
                inputRange,
                outputRange: outputRangeTranslateX,
            })
        }]
    };

    // Calculate width (assuming equal width tabs due to flex: 1)
    // If layout is not ready, default to 0
    const indicatorWidth = isLayoutReady ? (layout[0].width - 20) : 0;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only capture horizontal swipes
                return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx < -50) {
                    // Swipe Left -> Next Tab
                    const nextIndex = state.index + 1;
                    if (nextIndex < state.routes.length) {
                        const route = state.routes[nextIndex];
                        navigation.navigate(route.name, route.params);
                    }
                } else if (gestureState.dx > 50) {
                    // Swipe Right -> Previous Tab
                    const prevIndex = state.index - 1;
                    if (prevIndex >= 0) {
                        const route = state.routes[prevIndex];
                        navigation.navigate(route.name, route.params);
                    }
                }
            },
        })
    ).current;

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

            <View style={styles.tabsContainer}>
                {/* Active Tab Indicator (Slider) */}
                <Animated.View style={[
                    styles.activeTab,
                    { width: indicatorWidth },
                    animatedStyle
                ]} />

                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    const Icon = () => {
                        const color = isFocused ? Colors.surface : Colors.textLight;
                        const size = 24;

                        if (route.name === 'index' || route.name === 'home') return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        if (route.name === 'calendar') return <Calendar size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        if (route.name === 'settings' || route.name === 'more') return <Menu size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        return null;
                    };

                    const label = () => {
                        if (route.name === 'index' || route.name === 'home') return "Home";
                        if (route.name === 'calendar') return "Calendar";
                        if (route.name === 'settings' || route.name === 'more') return "More";
                        return "";
                    };

                    return (
                        <TouchableOpacity
                            key={index}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}

                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                            onLayout={(e) => handleLayout(e, index)}
                        >
                            <View style={styles.iconContainer}>
                                <Icon />
                                <Text style={[
                                    styles.label,
                                    { color: isFocused ? Colors.surface : Colors.textLight }
                                ]}>
                                    {label()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        ...Platform.select({
            web: {
                left: 0,
                right: 0,
                marginHorizontal: 'auto',
                width: '90%',
                maxWidth: 400,
            }
        })
    },
    tabsContainer: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        zIndex: 1,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        // Removed fixed width/height to allow auto-sizing
    },
    label: {
        fontSize: 10,
        fontFamily: 'Poppins_500Medium',
        marginTop: 2,
    },
    activeTab: {
        position: 'absolute',
        height: '80%',
        top: '10%',
        backgroundColor: Colors.primary,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 0,
    },
});
