import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../lib/AuthContext'

/**
 * BrandLink
 *
 * The PothiView mark, wherever it's used as a clickable "go home" element.
 * "Home" means different things depending on whether you're signed in:
 * an authenticated visitor lands on /library, everyone else lands on the
 * marketing page at /.
 */
const BrandLink = ({ size = 26, withWordmark = true, className = '', textClassName = '' }) => {
  const { user } = useAuth()

  return (
    <Link to={user ? '/library' : '/'} className="inline-flex">
      <Logo size={size} withWordmark={withWordmark} className={className} textClassName={textClassName} />
    </Link>
  )
}

export default BrandLink
