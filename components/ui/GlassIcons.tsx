import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

export interface AppIconProps {
    size?: number;
    color?: string;
    glassColor?: string;
    strokeWidth?: number;
}

/**
 * Nucleo Glass-inspired layered duotone + crisp explicit-stroke SVG icons.
 * Uses explicit color hex/rgba strings instead of `currentColor` so Android
 * react-native-svg always renders accurate highlights and contrast.
 */
export function GlassHomeIcon({
    size = 22,
    color = '#334155',
    glassColor = 'rgba(15, 82, 186, 0.16)',
    strokeWidth = 1.85,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M3.5 10.6C3.5 9.5 4.02 8.47 4.9 7.82L10.3 3.83C11.31 3.09 12.69 3.09 13.7 3.83L19.1 7.82C19.98 8.47 20.5 9.5 20.5 10.6V17.5C20.5 19.43 18.93 21 17 21H7C5.07 21 3.5 19.43 3.5 17.5V10.6Z"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
            <Path
                d="M9.5 21V15.2C9.5 14.26 10.26 13.5 11.2 13.5H12.8C13.74 13.5 14.5 14.26 14.5 15.2V21"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function GlassTimetableIcon({
    size = 22,
    color = '#334155',
    glassColor = 'rgba(15, 82, 186, 0.16)',
    strokeWidth = 1.8,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="3.25"
                y="3.25"
                width="7.75"
                height="7.75"
                rx="2.3"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Rect
                x="13"
                y="3.25"
                width="7.75"
                height="7.75"
                rx="2.3"
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Rect
                x="3.25"
                y="13"
                width="7.75"
                height="7.75"
                rx="2.3"
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Rect
                x="13"
                y="13"
                width="7.75"
                height="7.75"
                rx="2.3"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
        </Svg>
    );
}

export function GlassAttendanceIcon({
    size = 22,
    color = '#334155',
    glassColor = 'rgba(15, 82, 186, 0.16)',
    strokeWidth = 1.8,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="4.5"
                y="4.5"
                width="15"
                height="16.5"
                rx="3.2"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M9 4.5C9 3.67 9.67 3 10.5 3H13.5C14.33 3 15 3.67 15 4.5V5.5C15 6.05 14.55 6.5 14 6.5H10C9.45 6.5 9 6.05 9 5.5V4.5Z"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M8.75 13.2L11 15.4L15.5 10.8"
                stroke={color}
                strokeWidth={strokeWidth + 0.15}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function GlassCalendarIcon({
    size = 22,
    color = '#334155',
    glassColor = 'rgba(15, 82, 186, 0.16)',
    strokeWidth = 1.8,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="3.25"
                y="4.75"
                width="17.5"
                height="16"
                rx="3.5"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Line
                x1="3.5"
                y1="9.75"
                x2="20.5"
                y2="9.75"
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Line
                x1="8"
                y1="2.75"
                x2="8"
                y2="6"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Line
                x1="16"
                y1="2.75"
                x2="16"
                y2="6"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Circle cx="12" cy="15" r="1.65" fill={color} />
        </Svg>
    );
}

export function GlassMoreIcon({
    size = 22,
    color = '#334155',
    glassColor = 'rgba(15, 82, 186, 0.16)',
    strokeWidth = 1.8,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="3.5"
                y="4.5"
                width="17"
                height="15"
                rx="4"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Line
                x1="7.5"
                y1="9.5"
                x2="16.5"
                y2="9.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Line
                x1="7.5"
                y1="14.5"
                x2="13.5"
                y2="14.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </Svg>
    );
}

export function ShieldCheckIcon({
    size = 22,
    color = '#0F52BA',
    glassColor = 'rgba(15, 82, 186, 0.14)',
    strokeWidth = 1.85,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M12 2.75L4.5 5.8V11.3C4.5 16.22 7.71 20.66 12 21.85C16.29 20.66 19.5 16.22 19.5 11.3V5.8L12 2.75Z"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
            <Path
                d="M9.1 12.2L11.1 14.2L15.1 10.1"
                stroke={color}
                strokeWidth={strokeWidth + 0.15}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function LockKeyholeIcon({
    size = 24,
    color = '#0F52BA',
    glassColor = 'rgba(15, 82, 186, 0.14)',
    strokeWidth = 1.85,
}: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="4.5"
                y="10"
                width="15"
                height="11"
                rx="3.2"
                fill={glassColor}
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M8 10V7.2C8 4.99 9.79 3.2 12 3.2C14.21 3.2 16 4.99 16 7.2V10"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Circle cx="12" cy="15.2" r="1.4" fill={color} />
        </Svg>
    );
}

export function RefreshIcon({ size = 16, color = '#FFFFFF', strokeWidth = 2 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M20 11A8 8 0 0 0 6.3 5.3L4 7.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M4 3.8V7.5H7.7"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M4 13A8 8 0 0 0 17.7 18.7L20 16.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M20 20.2V16.5H16.3"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export const RestartIcon = RefreshIcon;

export function ClockCircleIcon({ size = 14, color = '#475569', strokeWidth = 1.85 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
            <Path
                d="M12 7.5V12.2L15 14"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function TrashBinMinimalisticIcon({ size = 18, color = '#475569', strokeWidth = 1.85 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="4" y1="6.5" x2="20" y2="6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Path
                d="M9.5 4H14.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Path
                d="M6.5 6.5L7.4 18.1C7.51 19.46 8.64 20.5 10 20.5H14C15.36 20.5 16.49 19.46 16.6 18.1L17.5 6.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Line x1="10.2" y1="10.5" x2="10.5" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="13.8" y1="10.5" x2="13.5" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
    );
}

export function SquareTopDownIcon({ size = 15, color = '#475569', strokeWidth = 1.85 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M14 4.5H19.5V10"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Line x1="11.5" y1="12.5" x2="19.2" y2="4.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Path
                d="M19 14V17.5C19 18.88 17.88 20 16.5 20H6.5C5.12 20 4 18.88 4 17.5V7.5C4 6.12 5.12 5 6.5 5H10"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function EyeIcon({ size = 18, color = '#475569', strokeWidth = 1.85 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M2.5 12C4.6 7.8 8.05 5.75 12 5.75C15.95 5.75 19.4 7.8 21.5 12C19.4 16.2 15.95 18.25 12 18.25C8.05 18.25 4.6 16.2 2.5 12Z"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
            <Circle cx="12" cy="12" r="2.75" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
    );
}

export function EyeClosedIcon({ size = 18, color = '#475569', strokeWidth = 1.85 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M3 3L21 21"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Path
                d="M10.4 6.05C10.92 5.85 11.46 5.75 12 5.75C15.95 5.75 19.4 7.8 21.5 12C20.66 13.68 19.56 15.08 18.24 16.12"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M6.4 8.2C4.78 9.24 3.45 10.52 2.5 12C4.6 16.2 8.05 18.25 12 18.25C13.38 18.25 14.7 17.99 15.9 17.48"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function CloseCircleIcon({ size = 22, color = '#475569', strokeWidth = 1.9 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth={strokeWidth} />
            <Line x1="9.2" y1="9.2" x2="14.8" y2="14.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="14.8" y1="9.2" x2="9.2" y2="14.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
    );
}

export function AltArrowLeftIcon({ size = 22, color = '#0F172A', strokeWidth = 2 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M15 5.5L8.5 12L15 18.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function AltArrowRightIcon({ size = 22, color = '#0F172A', strokeWidth = 2 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M9 5.5L15.5 12L9 18.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function ShareIcon({ size = 20, color = '#FFFFFF', strokeWidth = 1.9 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M12 3.5V14.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Path
                d="M8 7.5L12 3.5L16 7.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M5 13.5V18C5 19.38 6.12 20.5 7.5 20.5H16.5C17.88 20.5 19 19.38 19 18V13.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export function AddSquareIcon({ size = 20, color = '#FFFFFF', strokeWidth = 1.9 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect
                x="3.75"
                y="3.75"
                width="16.5"
                height="16.5"
                rx="3.5"
                stroke={color}
                strokeWidth={strokeWidth}
            />
            <Line x1="12" y1="8.2" x2="12" y2="15.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="8.2" y1="12" x2="15.8" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
    );
}

export function AlertTriangleIcon({ size = 36, color = '#DC2626', strokeWidth = 1.9 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M10.29 4.86L2.82 17.75C2.05 19.08 3.01 20.75 4.55 20.75H19.45C20.99 20.75 21.95 19.08 21.18 17.75L13.71 4.86C12.94 3.53 11.06 3.53 10.29 4.86Z"
                fill="rgba(220, 38, 38, 0.14)"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
            />
            <Line x1="12" y1="9.5" x2="12" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Circle cx="12" cy="17.2" r="1.1" fill={color} />
        </Svg>
    );
}

export function WifiOffIcon({ size = 36, color = '#0F52BA', strokeWidth = 1.9 }: AppIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M8.5 16.5C10.5 14.8 13.5 14.8 15.5 16.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Path
                d="M5.2 12.8C9 9.5 15 9.5 18.8 12.8"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Path
                d="M2.2 9.2C7.8 4.4 16.2 4.4 21.8 9.2"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Circle cx="12" cy="19.5" r="1.2" fill={color} />
            <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
    );
}
