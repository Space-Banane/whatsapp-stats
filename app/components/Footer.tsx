export default function Footer() {
  return (
    <footer className="border-t border-gray-800 py-12 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
        <p className="text-sm mb-4">
          © {new Date().getFullYear()} Whats my Stats? No data is ever sent to a server.
        </p>
        <p className="text-xs max-w-xl mx-auto leading-relaxed">
          Your privacy matters. All chat analysis is performed locally in your browser. 
          The data never leaves your device.
        </p>
        <a href="https://space.reversed.dev" className="text-xs text-gray-400 hover:text-white transition-colors">
            Made by Space; Ensuring your data stays private.
        </a>
      </div>
    </footer>
  );
}
