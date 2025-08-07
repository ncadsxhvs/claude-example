import Layout from '@/components/ui/Layout';
import Link from 'next/link';

export default function AboutPage() {
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
          About Riley
        </h1>
        
        <div className="prose prose-lg text-gray-700 space-y-6">
          <p>
            Riley Brown is a pioneering AI educator and content creator who has transformed how people understand and interact with artificial intelligence. With a background in marketing and technology, Riley identified the massive potential of AI tools early on and has dedicated his career to making these powerful technologies accessible to everyone.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Journey to AI Education
          </h3>
          <p>
            Riley's journey began when he had early access to GPT-3 models and immediately recognized that ChatGPT would be "the most viral piece of technology" he'd ever seen. This foresight led him to become one of the first educators to focus exclusively on practical AI applications.
          </p>
          
          <p>
            His rapid rise to prominence is remarkable: going from zero followers to 201,000 followers in just 45 days, accumulating over 30 million views in that period. Today, he's known as the #1 AI educator on TikTok with 8.7M likes and 616.8K followers.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Mission & Philosophy
          </h3>
          <p>
            Riley's mission is "to educate people on how to use these AI tools that are either very cheap or free and use it to better communicate with the world digitally." He believes that AI should be accessible to everyone, not just the tech-savvy, and focuses on practical applications rather than theoretical concepts.
          </p>
          
          <p>
            His teaching philosophy centers around the concept of "Vibe Coding" - using AI to create applications without traditional coding knowledge. This approach has democratized app development and opened new possibilities for creators and entrepreneurs.
          </p>
          
          <div className="bg-black/[0.02] rounded-xl p-8 my-10 text-center">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">$125K</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Monthly Revenue</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">8.7M</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">TikTok Likes</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">616.8K</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Followers</div>
              </div>
            </div>
          </div>
          
          <p>
            Through his various platforms and the VibeCode app, Riley continues to push the boundaries of what's possible with AI, making complex technologies accessible to creators, entrepreneurs, and everyday users worldwide.
          </p>
        </div>
      </div>
    </Layout>
  );
}