import { Link } from 'react-router-dom'
import BrandLink from '../components/BrandLink'

const NotFound = () => (
  <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 text-center">
    <BrandLink size={30} className="mb-8" />
    <p className="font-serif text-6xl font-semibold text-ink/15 mb-2">404</p>
    <h1 className="text-lg font-semibold text-ink mb-2">This page doesn't exist</h1>
    <p className="text-sm text-ink-soft mb-6">The link might be broken, or the page may have moved.</p>
    <Link to="/library" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
      Back to your library
    </Link>
  </div>
)

export default NotFound
