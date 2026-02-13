
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Home, Calendar, Menu } from 'lucide-react-native';

export function TabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const [layout, setLayout] = React.useState<{ width: number; x: number }[]>([]);
    const translateX = useSharedValue(0);
    const tabWidth = useSharedValue(0);

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

    useEffect(() => {
        if (layout.length > 0 && layout[state.index] && layout[state.index].width > 0) {
            translateX.value = withSpring(layout[state.index].x, {
                damping: 15,
                stiffness: 150,
            });
            tabWidth.value = withSpring(layout[state.index].width, {
                damping: 15,
                stiffness: 150,
            });
        }
    }, [state.index, layout]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: tabWidth.value,
        };
    });

    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

            <View style={styles.tabsContainer}>
                {/* Active Tab Indicator (Slider) */}
                <Animated.View style={[styles.activeTab, animatedStyle]} />

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
                        const color = isFocused ? Colors.primary : Colors.textLight;
                        const size = 24;

                        if (route.name === 'index' || route.name === 'home') return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        if (route.name === 'calendar') return <Calendar size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        if (route.name === 'settings' || route.name === 'more') return <Menu size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        return null;
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
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeTab: {
        position: 'absolute',
        height: '80%',
        top: '10%',
        backgroundColor: 'rgba(255, 255, 255, 1)',
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
