'use client';

import { useState } from 'react';

// ─── Device type visual config ────────────────────────────────────────────────

const DEVICE_TYPES: Record<string, { label: string; bg: string; fg: string; path: string }> = {
  'smart-bulb': {
    label: 'Smart Bulb',
    bg: '#FEF9C3',
    fg: '#CA8A04',
    path: 'M9 21h6M12 3C8.13 3 5 6.13 5 10c0 2.39 1.17 4.5 3 5.81V18h8v-2.19C17.83 14.5 19 12.39 19 10c0-3.87-3.13-7-7-7zM9 18v1h6v-1H9z',
  },
  'smart-plug': {
    label: 'Smart Plug',
    bg: '#DBEAFE',
    fg: '#1D4ED8',
    path: 'M7 7V3h2v4H7zm8 0V3h2v4h-2zM5 9h14v2a7 7 0 01-6 6.93V21h-2v-3.07A7 7 0 015 11V9z',
  },
  'smart-lock': {
    label: 'Smart Lock',
    bg: '#DCFCE7',
    fg: '#16A34A',
    path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  'thermostat': {
    label: 'Thermostat',
    bg: '#FEE2E2',
    fg: '#DC2626',
    path: 'M12 2C8.13 2 5 5.13 5 9v1c0 2.76 1.57 5.17 4 6.32V18h.5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1h.5v-1.68C17.43 15.17 19 12.76 19 10V9c0-3.87-3.13-7-7-7zm0 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm1-7h-2v2H9v2h2v2h2v-2h2v-2h-2V8z',
  },
  'camera': {
    label: 'Security Camera',
    bg: '#EDE9FE',
    fg: '#7C3AED',
    path: 'M15 10l4.553-2.07A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm4-8a1 1 0 110 2 1 1 0 010-2z',
  },
  'sensor': {
    label: 'Sensor',
    bg: '#F0FDF4',
    fg: '#15803D',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  'switch': {
    label: 'Smart Switch',
    bg: '#F0F9FF',
    fg: '#0369A1',
    path: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm3 5a1 1 0 100 2h8a1 1 0 100-2H8zm0 4a1 1 0 100 2h5a1 1 0 100-2H8z',
  },
  'doorbell': {
    label: 'Video Doorbell',
    bg: '#FFF7ED',
    fg: '#C2410C',
    path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
};

const ECOSYSTEM_STYLES: Record<string, { bg: string; fg: string }> = {
  alexa:          { bg: '#DBEAFE', fg: '#1D4ED8' },
  google:         { bg: '#FEE2E2', fg: '#DC2626' },
  homekit:        { bg: '#F3F4F6', fg: '#111827' },
  home_assistant: { bg: '#CCFBF1', fg: '#0D9488' },
};

const FALLBACK = {
  bg: '#F3F4F6',
  fg: '#6B7280',
  path: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DeviceExampleImageProps {
  /** Device type key, e.g. 'smart-bulb', 'smart-plug' */
  type?: string;
  /** Ecosystem key, e.g. 'alexa', 'google' — affects background colour when no real image */
  ecosystem?: string;
  /** Public image path override, e.g. '/device-examples/alexa/echo-dot.jpg' */
  src?: string;
  alt: string;
  className?: string;
}

export default function DeviceExampleImage({
  type,
  ecosystem,
  src,
  alt,
  className = '',
}: DeviceExampleImageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const deviceCfg = type ? DEVICE_TYPES[type] : undefined;
  const ecoStyle  = ecosystem ? ECOSYSTEM_STYLES[ecosystem] : undefined;

  const bg   = deviceCfg?.bg  ?? ecoStyle?.bg  ?? FALLBACK.bg;
  const fg   = deviceCfg?.fg  ?? ecoStyle?.fg  ?? FALLBACK.fg;
  const path = deviceCfg?.path ?? FALLBACK.path;

  // If a real image path is given and hasn't failed, show it
  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setImgFailed(true)}
        loading="lazy"
      />
    );
  }

  // SVG placeholder
  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: bg }}
      role="img"
      aria-label={alt}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={fg}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-2/5 h-2/5"
      >
        <path d={path} />
      </svg>
    </div>
  );
}
