import React, { useEffect, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Navigator } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LiquidGlassSurface } from './LiquidGlassSurface';
import {
    GlassAttendanceIcon,
    GlassCalendarIcon,
    GlassHomeIcon,
    GlassMoreIcon,
    GlassTimetableIcon,
} from './GlassIcons';
import { Colors } from '../../constants/Colors';

interface TabBarProps {
    blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
}

const ALL_TAB_ITEMS = [
    { name: 'home', label: 'Home' },
    { name: 'timetable', label: 'Timetable' },
    { name: 'attendance', label: 'Attendance' },
    { name: 'calendar', label: 'Calendar' },
    { name: 'settings', label: 'More' },
] as const;

const TAB_ITEMS =
    Platform.OS === 'web'
        ? ALL_TAB_ITEMS.filter((item) => item.name !== 'attendance')
        : ALL_TAB_ITEMS;

export function TabBar({ blurTarget }: TabBarProps) {
    const { state, navigation } = Navigator.useContext();
    const activeRouteName = state.routes[state.index]?.name ?? 'home';
    const rawIndex = TAB_ITEMS.findIndex((t) => t.name === activeRouteName);
    const activeIndex = rawIndex >= 0 ? rawIndex : 0;

    const [layout, setLayout] = useState<{ width: number; x: number }[]>([]);
    const [animatedIndex] = useState(() => new Animated.Value(activeIndex));

    useEffect(() => {
        Animated.spring(animatedIndex, {
            toValue: activeIndex,
            damping: 20,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
        }).start();
    }, [activeIndex, animatedIndex]);

    const handleLayout = (event: LayoutChangeEvent, index: number) => {
        const { width, x } = event.nativeEvent.layout;
        setLayout((prev) => {
            if (prev[index]?.width === width && prev[index]?.x === x) return prev;
            const base =
                prev.length === TAB_ITEMS.length
                    ? prev
                    : new Array(TAB_ITEMS.length).fill({ width: 0, x: 0 });
            const next = [...base];
            next[index] = { width, x };
            return next;
        });
    };

    const isLayoutReady =
        layout.length === TAB_ITEMS.length &&
        layout.every((l) => l.width > 0);
    const pillInset = 3;
    const inputRange = TAB_ITEMS.map((_, i) => i);
    const outputRangeTranslateX = isLayoutReady
        ? layout.map((l) => l.x + pillInset)
        : TAB_ITEMS.map(() => 0);

    const animatedStyle = {
        transform: [
            {
                translateX: isLayoutReady
                    ? animatedIndex.interpolate({
                          inputRange,
                          outputRange: outputRangeTranslateX,
                      })
                    : 0,
            },
        ],
    };

    const indicatorWidth = isLayoutReady ? Math.max(0, layout[0].width - pillInset * 2) : 0;

    const renderIcon = (routeName: string, isFocused: boolean) => {
        const color = isFocused ? '#FFFFFF' : '#1E293B';
        const glassColor = isFocused ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 82, 186, 0.14)';
        const size = 21;

        if (routeName === 'home') {
            return <GlassHomeIcon size={size} color={color} glassColor={glassColor} />;
        }
        if (routeName === 'timetable') {
            return <GlassTimetableIcon size={size} color={color} glassColor={glassColor} />;
        }
        if (routeName === 'attendance') {
            return <GlassAttendanceIcon size={size} color={color} glassColor={glassColor} />;
        }
        if (routeName === 'calendar') {
            return <GlassCalendarIcon size={size} color={color} glassColor={glassColor} />;
        }
        return <GlassMoreIcon size={size} color={color} glassColor={glassColor} />;
    };

    return (
        <LiquidGlassSurface
            interactive
            borderRadius={34}
            blurTarget={blurTarget}
            refractOptions={{ strength: 1.05, bezel: 16, blur: 10, dispersion: 0.04 }}
            style={styles.container}
        >
            <View style={styles.tabsContainer}>
                {isLayoutReady && (
                    <Animated.View
                        pointerEvents="none"
                        style={[styles.activeTab, { width: indicatorWidth }, animatedStyle]}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#0F52BA']}
                            start={{ x: 0.1, y: 0 }}
                            end={{ x: 0.9, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.activeTabSpecular} />
                    </Animated.View>
                )}

                {TAB_ITEMS.map((item, index) => {
                    const isFocused = activeIndex === index;

                    const onPress = () => {
                        if (!isFocused) {
                            navigation.navigate(item.name);
                        }
                    };

                    return (
                        <Pressable
                            key={item.name}
                            accessibilityRole="tab"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={item.label}
                            onPress={onPress}
                            style={({ pressed }) => [
                                styles.tabItem,
                                pressed && styles.tabItemPressed,
                            ]}
                            onLayout={(e) => handleLayout(e, index)}
                        >
                            <View style={styles.iconContainer}>
                                {renderIcon(item.name, isFocused)}
                                <Text
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.85}
                                    style={[
                                        styles.label,
                                        isFocused && styles.labelFocused,
                                        { color: isFocused ? '#FFFFFF' : '#1E293B' },
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </LiquidGlassSurface>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        height: 68,
        borderRadius: 34,
        zIndex: 50,
        ...Platform.select({
            web: {
                left: 0,
                right: 0,
                marginHorizontal: 'auto',
                width: '96%',
                maxWidth: 440,
            },
            ios: {
                left: 8,
                right: 8,
                shadowColor: '#0F172A',
                shadowOffset: {
                    width: 0,
                    height: 12,
                },
                shadowOpacity: 0.14,
                shadowRadius: 24,
            },
            android: {
                left: 8,
                right: 8,
            },
        }),
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
        minWidth: 44,
        minHeight: 44,
        height: '100%',
        zIndex: 1,
        paddingHorizontal: 2,
    },
    tabItemPressed: {
        transform: [{ scale: 0.94 }],
        opacity: 0.85,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        fontFamily: 'Poppins_500Medium',
        marginTop: 2,
        letterSpacing: -0.2,
    },
    labelFocused: {
        fontFamily: 'Poppins_600SemiBold',
    },
    activeTab: {
        position: 'absolute',
        height: '82%',
        top: '9%',
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.56)',
        shadowColor: Colors.primaryDark,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 0,
    },
    activeTabSpecular: {
        position: 'absolute',
        top: 0,
        left: 6,
        right: 6,
        height: '42%',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
});
