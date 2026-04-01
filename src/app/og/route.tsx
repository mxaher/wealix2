import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Wealix — Your Personal Wealth OS';
  const subtitle = searchParams.get('subtitle') ?? 'AI-powered portfolio tracking for MENA investors';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%)',
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
          }}
        />

        {/* Logo / Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: 'white',
            }}
          >
            W
          </div>
          <span style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 700 }}>Wealix</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#f8fafc',
            lineHeight: 1.15,
            maxWidth: '900px',
            marginBottom: '24px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: '#94a3b8',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '100px',
            padding: '8px 20px',
          }}
        >
          <span style={{ color: '#818cf8', fontSize: '14px', fontWeight: 600 }}>
            wealix.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
