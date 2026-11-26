import React, { useEffect, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Platform,
    StyleProp,
    StyleSheet,
    View,
    ViewProps,
    ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import {
    attachLiquidGlassRefraction,
    ensureLiquidGlassWebStyles,
    LiquidGlassRefractOptions,
    prefersReducedTransparencyWeb,
} from '../../utils/liquidGlassWeb';

export interface LiquidGlassSurfaceProps extends ViewProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'regular' | 'clear';
    tone?: 'light' | 'dark';
    interactive?: boolean;
    tintColor?: string;
    borderRadius?: number;
    textHeavy?: boolean;
    blurTarget?: React.RefObject<React.ComponentRef<typeof View> | null>;
    refractOptions?: LiquidGlassRefractOptions;
}

export function LiquidGlassSurface({
    children,
    style,
    variant = 'regular',
    tone = 'light',
    interactive = false,
    tintColor,
    borderRadius = 22,
    textHeavy = false,
    blurTarget,
    refractOptions,
    ...rest
}: LiquidGlassSurfaceProps) {
    const webRef = useRef<React.ComponentRef<typeof View>>(null);
    const [reduceTransparency, setReduceTransparency] = useState(() =>
        Platform.OS === 'web' ? prefersReducedTransparencyWeb() : false
    );
    const isDark = tone === 'dark';

    const refractStrength = refractOptions?.strength;
    const refractBezel = refractOptions?.bezel;
    const refractBlur = refractOptions?.blur;
    const refractDispersion = refractOptions?.dispersion;
    const refractMagnify = refractOptions?.magnify;

    useEffect(() => {
        if (Platform.OS === 'web') {
            ensureLiquidGlassWebStyles();
            if (typeof window === 'undefined') return;
            const mq = window.matchMedia('(prefers-reduced-transparency: reduce)');
            const sync = () => setReduceTransparency(prefersReducedTransparencyWeb());
            sync();
            if (mq.addEventListener) mq.addEventListener('change', sync);
            return () => {
                if (mq.removeEventListener) mq.removeEventListener('change', sync);
            };
        }

        let mounted = true;
        AccessibilityInfo.isReduceTransparencyEnabled()
            .then((enabled) => {
                if (mounted) setReduceTransparency(Boolean(enabled));
            })
            .catch(() => {});

        const sub = AccessibilityInfo.addEventListener(
            'reduceTransparencyChanged',
            (enabled: boolean) => {
                setReduceTransparency(Boolean(enabled));
            }
        );

        return () => {
            mounted = false;
            sub.remove();
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const node = webRef.current as unknown as HTMLElement | null;
        if (!node) return;

        node.classList.add('lg-surface');
        node.classList.toggle('lg-tone-dark', isDark);
        node.classList.toggle('lg-variant-clear', variant === 'clear');
        node.classList.toggle('lg-text-heavy', textHeavy);

        const detach = attachLiquidGlassRefraction(node, {
            strength: refractStrength,
            bezel: refractBezel,
            blur: refractBlur,
            dispersion: refractDispersion,
            magnify: refractMagnify,
            clear: variant === 'clear',
        });

        return () => {
            detach();
            node.classList.remove('lg-surface', 'lg-tone-dark', 'lg-variant-clear', 'lg-text-heavy');
        };
    }, [
        isDark,
        variant,
        textHeavy,
        refractStrength,
        refractBezel,
        refractBlur,
        refractDispersion,
        refractMagnify,
    ]);

    const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
    const {
        alignItems,
        justifyContent,
        flexDirection,
        flexWrap,
        gap,
        rowGap,
        columnGap,
        padding,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        paddingHorizontal,
        paddingVertical,
        ...outerLayoutStyle
    } = flatStyle;

    const innerContentStyle: ViewStyle = {
        ...(alignItems !== undefined && { alignItems }),
        ...(justifyContent !== undefined && { justifyContent }),
        ...(flexDirection !== undefined && { flexDirection }),
        ...(flexWrap !== undefined && { flexWrap }),
        ...(gap !== undefined && { gap }),
        ...(rowGap !== undefined && { rowGap }),
        ...(columnGap !== undefined && { columnGap }),
        ...(padding !== undefined && { padding }),
        ...(paddingTop !== undefined && { paddingTop }),
        ...(paddingRight !== undefined && { paddingRight }),
        ...(paddingBottom !== undefined && { paddingBottom }),
        ...(paddingLeft !== undefined && { paddingLeft }),
        ...(paddingHorizontal !== undefined && { paddingHorizontal }),
        ...(paddingVertical !== undefined && { paddingVertical }),
    };

    const radiusStyle: ViewStyle = { borderRadius };

    // 1. iOS 26+: Real Apple UIVisualEffect / SwiftUI Liquid Glass
    if (Platform.OS === 'ios' && isLiquidGlassAvailable() && !reduceTransparency) {
        return (
            <GlassView
                glassEffectStyle={variant}
                isInteractive={interactive}
                colorScheme={tone}
                tintColor={tintColor ?? (isDark ? 'rgba(28, 30, 36, 0.52)' : 'rgba(255, 255, 255, 0.42)')}
                style={[styles.nativeContainer, radiusStyle, style]}
                {...rest}
            >
                {children}
            </GlassView>
        );
    }

    // 2. Web: tokens.css directional bevel + specular sheen + Chromium SVG rim refraction
    if (Platform.OS === 'web') {
        return (
            <View
                ref={webRef}
                style={[
                    styles.nativeContainer,
                    radiusStyle,
                    reduceTransparency && (isDark ? styles.opaqueDark : styles.opaqueLight),
                    style,
                ]}
                {...rest}
            >
                {children}
            </View>
        );
    }

    // 3. Accessibility Reduce Transparency fallback on native (opaque high-contrast surface)
    if (reduceTransparency) {
        return (
            <View
                style={[
                    styles.nativeContainer,
                    radiusStyle,
                    isDark ? styles.opaqueDark : styles.opaqueLight,
                    style,
                ]}
                {...rest}
            >
                {children}
            </View>
        );
    }

    // 4. Older iOS (<26) & Android: real backdrop blur (DimezisBlurView via blurTarget on Android, BlurView on iOS)
    //    layered with a luminous milky frosted tint, 1.5px 135deg bevel highlight rim, and top specular falloff.
    const hasAndroidBlur = Platform.OS === 'android' && Boolean(blurTarget?.current);
    const baseColor = isDark
        ? hasAndroidBlur
            ? 'rgba(24, 24, 30, 0.72)'
            : 'rgba(30, 30, 36, 0.90)'
        : variant === 'clear'
            ? 'rgba(255, 255, 255, 0.34)'
            : hasAndroidBlur
                ? 'rgba(255, 255, 255, 0.74)'
                : 'rgba(255, 255, 255, 0.90)';

    const rimColors: readonly [string, string, string] = isDark
        ? ['rgba(255, 255, 255, 0.48)', 'rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.28)']
        : ['rgba(255, 255, 255, 0.98)', 'rgba(148, 163, 184, 0.24)', 'rgba(255, 255, 255, 0.76)'];

    const androidHairlineStyle: ViewStyle | undefined =
        Platform.OS === 'android'
            ? {
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.11)',
              }
            : undefined;

    return (
        <View style={[styles.nativeContainer, radiusStyle, androidHairlineStyle, outerLayoutStyle]} {...rest}>
            {/* Directional bevel rim frame */}
            <LinearGradient
                colors={rimColors}
                locations={[0, 0.48, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, radiusStyle]}
            />
            <View
                style={[
                    styles.nativeBevelInner,
                    {
                        borderRadius: Math.max(0, borderRadius - 1.5),
                        backgroundColor: hasAndroidBlur ? 'transparent' : baseColor,
                    },
                    innerContentStyle,
                ]}
            >
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={variant === 'clear' ? 45 : 85}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                {hasAndroidBlur && (
                    <BlurView
                        blurTarget={blurTarget}
                        blurMethod="dimezisBlurViewSdk31Plus"
                        intensity={variant === 'clear' ? 48 : 88}
                        blurReductionFactor={3}
                        tint={isDark ? 'dark' : 'light'}
                        style={[StyleSheet.absoluteFill, { borderRadius: Math.max(0, borderRadius - 1.5) }]}
                    />
                )}
                {hasAndroidBlur && (
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, { backgroundColor: baseColor }]}
                    />
                )}
                {/* Top specular light falloff */}
                <LinearGradient
                    colors={
                        isDark
                            ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'transparent']
                            : ['rgba(255, 255, 255, 0.62)', 'rgba(255, 255, 255, 0.14)', 'transparent']
                    }
                    locations={[0, 0.36, 0.72]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                />
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    nativeContainer: {
        overflow: 'hidden',
    },
    nativeBevelInner: {
        flex: 1,
        alignSelf: 'stretch',
        margin: 1,
        overflow: 'hidden',
    },
    opaqueLight: {
        backgroundColor: 'rgba(252, 252, 254, 0.95)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(15, 23, 42, 0.12)',
    },
    opaqueDark: {
        backgroundColor: 'rgba(28, 28, 32, 0.96)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.14)',
    },
});
