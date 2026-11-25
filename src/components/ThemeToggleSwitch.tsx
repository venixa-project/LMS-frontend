import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../lib/themeStore';

interface ThemeToggleSwitchProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({
  className = '',
  size = 'md',
}) => {
  const { preference, toggleTheme } = useThemeStore();
  const isDark = preference === 'dark';

  // Sizing configurations
  const dimensions = {
    sm: { width: 84, height: 30, knob: 24, pad: 3, icon: 13, text: '0.50rem' },
    md: { width: 96, height: 34, knob: 28, pad: 3, icon: 15, text: '0.56rem' },
    lg: { width: 112, height: 40, knob: 34, pad: 3, icon: 18, text: '0.64rem' },
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <div
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className={`theme-neumorphic-switch ${className}`}
      style={{
        position: 'relative',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        borderRadius: '9999px',
        cursor: 'pointer',
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${dimensions.pad}px`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isDark ? '#192231' : '#e6ebf1',
        boxShadow: isDark
          ? 'inset 2px 2px 5px rgba(0, 0, 0, 0.65), inset -1px -1px 3px rgba(255, 255, 255, 0.08)'
          : 'inset 2px 2px 5px rgba(163, 177, 198, 0.6), inset -2px -2px 5px rgba(255, 255, 255, 0.9)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.04)',
        outline: 'none',
      }}
      title={`Current: ${isDark ? 'Dark Mode' : 'Light Mode'}. Click to toggle.`}
    >
      {/* Light Mode Label (Visible on left when in Light Mode) */}
      <div
        style={{
          position: 'absolute',
          left: '11px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'translateX(-8px)' : 'translateX(0)',
          transition: 'all 0.25s ease',
          lineHeight: 1.05,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#5b6b7d',
          fontSize: dimensions.text,
        }}
      >
        <span>LIGHT</span>
        <span>MODE</span>
      </div>

      {/* Dark Mode Label (Visible on right when in Dark Mode) */}
      <div
        style={{
          position: 'absolute',
          right: '11px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'translateX(0)' : 'translateX(8px)',
          transition: 'all 0.25s ease',
          lineHeight: 1.05,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#94a3b8',
          fontSize: dimensions.text,
        }}
      >
        <span>DARK</span>
        <span>MODE</span>
      </div>

      {/* 3D Convex Neumorphic Sliding Knob */}
      <div
        style={{
          position: 'absolute',
          top: `${dimensions.pad}px`,
          left: `${dimensions.pad}px`,
          width: `${dimensions.knob}px`,
          height: `${dimensions.knob}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#2e3b4e' : '#f8fafc',
          transform: isDark
            ? 'translateX(0px)'
            : `translateX(${dimensions.width - dimensions.knob - dimensions.pad * 2}px)`,
          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease',
          boxShadow: isDark
            ? '0 3px 8px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3), inset 1px 1px 2px rgba(255, 255, 255, 0.15)'
            : '0 3px 8px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08), inset 1px 1px 2px rgba(255, 255, 255, 0.9)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.8)',
          zIndex: 2,
        }}
      >
        {isDark ? (
          <Moon
            size={dimensions.icon}
            color="#e2e8f0"
            strokeWidth={2.4}
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
              transform: 'rotate(-10deg)',
              transition: 'transform 0.3s ease',
            }}
          />
        ) : (
          <Sun
            size={dimensions.icon}
            color="#788896"
            strokeWidth={2.4}
            style={{
              filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.6))',
              transition: 'transform 0.3s ease',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ThemeToggleSwitch;
