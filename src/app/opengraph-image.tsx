import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'ChiRho Events - Built by Ministry for Ministry'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1E3A5F',
          backgroundImage: 'linear-gradient(135deg, #1E3A5F 0%, #0f1f33 100%)',
        }}
      >
        {/* Logo Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          {/* Chi-Rho Symbol */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: 'rgba(156, 132, 102, 0.2)',
              marginRight: 20,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: '#9C8466',
              }}
            >
              ☧
            </span>
          </div>
          <span
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            ChiRho Events
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 36,
              color: '#9C8466',
              marginBottom: 16,
            }}
          >
            Built by Ministry for Ministry
          </span>
          <span
            style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Steubenville Conferences • Diocesan Retreats • Parish Events
          </span>
        </div>

        {/* Bottom decoration */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              width: 60,
              height: 4,
              backgroundColor: '#9C8466',
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontSize: 18,
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            chirhoevents.com
          </span>
          <div
            style={{
              width: 60,
              height: 4,
              backgroundColor: '#9C8466',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
