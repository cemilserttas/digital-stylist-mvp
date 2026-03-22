import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DigitalStylist — Ton styliste IA personnel';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0014 0%, #1a0030 50%, #0d0020 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Orb déco haut-droite */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)',
        }} />
        {/* Orb déco bas-gauche */}
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>✨</div>
          <span style={{
            fontSize: 56, fontWeight: 900, letterSpacing: -2,
            background: 'linear-gradient(90deg, #ffffff, #e2d9f3)',
            backgroundClip: 'text',
            color: 'transparent',
          }}>DIGITAL<span style={{ color: '#c084fc' }}>STYLIST</span></span>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 48, fontWeight: 800, color: '#ffffff',
          textAlign: 'center', lineHeight: 1.2, marginBottom: 20,
          maxWidth: 900,
        }}>
          Ton look parfait en 30 secondes
        </div>

        {/* Sous-titre */}
        <div style={{
          fontSize: 26, color: 'rgba(255,255,255,0.6)',
          textAlign: 'center', maxWidth: 800,
        }}>
          L&apos;IA analyse ta garde-robe + la météo → ta tenue du jour
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 20, marginTop: 48 }}>
          {[
            { emoji: '☀️', label: 'Adapté à la météo' },
            { emoji: '👗', label: 'Ta vraie garde-robe' },
            { emoji: '🆓', label: 'Gratuit pour commencer' },
          ].map(({ emoji, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 50, paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20,
            }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
