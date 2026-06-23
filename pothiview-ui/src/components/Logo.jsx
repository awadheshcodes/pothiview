const Mark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
    <rect width="48" height="48" rx="10" fill="#2F7A60" />
    <path d="M11 18.5C11 17.12 12.12 16 13.5 16H24.5C25.88 16 27 17.12 27 18.5C27 19.88 25.88 21 24.5 21H13.5C12.12 21 11 19.88 11 18.5Z" fill="#FBF8F2" />
    <path d="M11 27.5C11 26.12 12.12 25 13.5 25H20.5C21.88 25 23 26.12 23 27.5C23 28.88 21.88 30 20.5 30H13.5C12.12 30 11 28.88 11 27.5Z" fill="#FBF8F2" fillOpacity="0.55" />
    <path d="M34.2 14.5L35.6 18.1L39.2 19.5L35.6 20.9L34.2 24.5L32.8 20.9L29.2 19.5L32.8 18.1L34.2 14.5Z" fill="#FBF8F2" />
  </svg>
)

const Logo = ({ size = 28, withWordmark = true, className = '', textClassName = '' }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <Mark size={size} />
    {withWordmark && (
      <span className={`font-serif font-semibold tracking-tight text-ink ${textClassName}`} style={{ fontSize: size * 0.62 }}>
        PothiView
      </span>
    )}
  </div>
)

export default Logo
