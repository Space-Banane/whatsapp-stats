import { Link } from "react-router";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-xl font-bold text-gray-300">
            Whats my <span className="text-green-600">Stats?</span>
          </Link>
          <div className="flex space-x-8 text-sm font-medium">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
            <Link to="/stats" className="text-gray-400 hover:text-white transition-colors">Stats</Link>
            <a 
              href="https://github.com/Space-Banane/whatsapp-stats" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
