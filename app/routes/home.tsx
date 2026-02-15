export function meta({}) {
  return [
    { title: "Whats my Stats? - WhatsApp Chat Analytics" },
    { name: "description", content: "Analyze your WhatsApp chats on the fly by uploading a Chat Export." },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-black text-gray-300 mb-6 tracking-tight">
          Whats my <span className="text-green-600">Stats?</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 mb-10 leading-relaxed">
          Ever wanted to know how much you chat with your friends? <br />
          Or who sends the most messages? Well, look no further!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="/stats"
            className="px-10 py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 transition-all hover:shadow-green-200 hover:-translate-y-0.5"
          >
            Let's get Yapping
          </a>
          <a
            href="https://github.com/Space-Banane/whatsapp-stats"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4 bg-gray-700 text-gray-50 font-bold text-lg rounded-2xl border border-gray-200 hover:bg-gray-900 transition-all hover:-translate-y-0.5"
          >
            Source code on GitHub
          </a>
        </div>

        <div className="bg-gray-900 border border-gray-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto">
          <p className="text-gray-300 mb-4 leading-relaxed">
            Analyze your WhatsApp chats on the fly by uploading a Chat Export. 
            <span className="block mt-2 font-medium text-gray-400">
              Only English chats exported from an Android Device supported (for now).
            </span>
          </p>
          <p className="text-sm text-gray-400 italic">
            Feature availability may vary from OS and App version.
          </p>
        </div>
      </div>
    </div>
  )
}
