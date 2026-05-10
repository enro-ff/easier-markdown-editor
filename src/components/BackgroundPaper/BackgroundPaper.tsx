import backgroundPaper from './img/image.png'

export default function BackgroundPaper() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -999,
        pointerEvents: 'none',
      }}
    >
      <img
        src={backgroundPaper}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
        }}
      />
    </div>
  )
}
