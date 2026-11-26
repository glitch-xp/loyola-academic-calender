import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface Props {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: Props) {
    const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
    const {
        backgroundColor,
        borderColor,
        borderWidth,
        borderLeftColor,
        borderLeftWidth,
        padding,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        paddingHorizontal,
        paddingVertical,
        ...outerStyles
    } = flatStyle;

    const surfaceColor = backgroundColor || '#FFFFFF';
    const hasCustomPadding =
        padding !== undefined ||
        paddingTop !== undefined ||
        paddingRight !== undefined ||
        paddingBottom !== undefined ||
        paddingLeft !== undefined ||
        paddingHorizontal !== undefined ||
        paddingVertical !== undefined;

    const innerPaddingStyle: ViewStyle = hasCustomPadding
        ? {
              ...(padding !== undefined && { padding }),
              ...(paddingTop !== undefined && { paddingTop }),
              ...(paddingRight !== undefined && { paddingRight }),
              ...(paddingBottom !== undefined && { paddingBottom }),
              ...(paddingLeft !== undefined && { paddingLeft }),
              ...(paddingHorizontal !== undefined && { paddingHorizontal }),
              ...(paddingVertical !== undefined && { paddingVertical }),
          }
        : {};

    const cardBorderStyle: ViewStyle = {
        borderWidth: borderWidth ?? StyleSheet.hairlineWidth,
        borderColor: borderColor ?? 'rgba(60, 60, 67, 0.13)',
        ...(borderLeftWidth !== undefined && { borderLeftWidth }),
        ...(borderLeftColor !== undefined && { borderLeftColor }),
    };

    return (
        <View style={[styles.containerShadow, outerStyles, { backgroundColor: surfaceColor }]}>
            <View style={[styles.innerClip, cardBorderStyle, { backgroundColor: surfaceColor }]}>
                <View style={[styles.content, innerPaddingStyle]}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    containerShadow: {
        borderRadius: 24,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 16,
    },
    innerClip: {
        borderRadius: 24,
        overflow: 'hidden',
        flexGrow: 1,
    },
    content: {
        padding: 20,
        flexGrow: 1,
    },
});
