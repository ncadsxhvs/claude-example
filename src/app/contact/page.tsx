import Layout from '@/components/ui/Layout';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <Layout showNavigation={false}>
      <Link 
        href="/" 
        className="fixed top-10 left-10 text-gray-600 hover:text-gray-800 transition-colors duration-300 z-10"
      >
        ← Back
      </Link>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-light mb-10 text-gray-900 tracking-tight">
          Connect
        </h1>
        
        <div className="prose prose-lg text-gray-700 space-y-6">
          <p>
            Riley Brown is active across multiple platforms, sharing AI insights, tutorials, and connecting with the community of creators and AI enthusiasts he's helped build.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Social Media
          </h3>
          <p>
            <strong>TikTok</strong> (@rileybrown.ai) - Follow for daily AI insights, quick tutorials, and the latest developments in artificial intelligence. This is where Riley shares his most immediate thoughts and discoveries in the AI space.
          </p>
          
          <p>
            <strong>Instagram</strong> (@realrileybrown) - Behind-the-scenes content, longer-form educational posts, and community highlights showcasing what his followers are building with AI.
          </p>
          
          <p>
            <strong>Twitter/X</strong> (@rileybrown_ai) - Real-time AI news, industry commentary, and engagement with the broader AI community. Riley frequently shares breaking developments and their implications.
          </p>
          
          <p>
            <strong>LinkedIn</strong> (Riley Brown - VibeCode) - Professional insights, company updates, and thought leadership content focused on AI's impact on business and creativity.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Educational Platforms
          </h3>
          <p>
            <strong>YouTube</strong> - Comprehensive tutorials, deep-dive guides, and complete project builds. This is the destination for anyone serious about learning AI application development.
          </p>
          
          <p>
            <strong>Substack</strong> (@rileybrownai) - In-depth written content, analysis of AI trends, and exclusive insights for the 2.8K+ subscribers who want deeper engagement with AI concepts.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Products & Apps
          </h3>
          <p>
            <strong>VibeCode App</strong> - Available on the App Store, this is Riley's flagship product that enables anyone to build mobile applications using natural language descriptions.
          </p>
          
          <p>
            <strong>Perplexi-Tube</strong> - Riley's latest creation, described as "the Perplexity for YouTube," showcasing rapid AI development capabilities.
          </p>
          
          <div className="bg-black/[0.02] rounded-xl p-8 my-10 text-center">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">Multiple</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Platforms</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">Daily</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Content</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">Community</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Focused</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Community Engagement
          </h3>
          <p>
            Riley is known for actively engaging with his community across all platforms. He frequently responds to comments, shares community creations, and provides guidance to those learning AI development.
          </p>
          
          <p>
            His approach to community building emphasizes practical learning and mutual support, creating an environment where both beginners and advanced users can learn from each other.
          </p>
          
          <p>
            For those looking to connect with Riley or join his community of AI creators, following him on any of these platforms provides access to cutting-edge AI education and a supportive learning environment.
          </p>
        </div>
      </div>
    </Layout>
  );
}