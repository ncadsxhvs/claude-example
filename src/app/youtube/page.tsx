import Layout from '@/components/ui/Layout';
import Link from 'next/link';

export default function YouTubePage() {
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
          YouTube Content
        </h1>
        
        <div className="prose prose-lg text-gray-700 space-y-6">
          <p>
            Riley's YouTube channel is the definitive resource for learning how to build real applications with AI tools. His content ranges from quick 8-minute builds to comprehensive hour-long deep dives, all focused on practical implementation rather than theory.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Content Philosophy
          </h3>
          <p>
            The channel is built around one core principle: building real apps with AI tools. Riley takes viewers through the entire development process, from initial concept to final launch, often completing projects within a single video. This approach gives viewers a complete understanding of the development lifecycle using AI.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Popular Series & Tutorials
          </h3>
          <p>
            <strong>The 6 Steps to Master AI</strong> - Riley's most comprehensive guide that takes viewers through the rapidly evolving world of artificial intelligence. This tutorial covers everything from basic chat AI tools to advanced coding applications, introducing over 100 practical ways to leverage AI without needing technical expertise.
          </p>
          
          <p>
            <strong>Vibe Coding Tutorials</strong> - A series dedicated to the concept of "vibe coding" - building applications by simply describing what you want to an AI. These tutorials have revolutionized how people think about app development, making it accessible to non-programmers.
          </p>
          
          <p>
            <strong>Real-Time Builds</strong> - Videos where Riley builds complete applications live, showing every step of the process including problem-solving and iteration. These provide authentic insight into the development process using AI tools.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Teaching Approach
          </h3>
          <p>
            Riley's teaching style is characterized by its accessibility and practical focus. He makes AI development approachable for beginners while providing enough depth for intermediate users to advance their skills. The content is designed for immediate application rather than passive consumption.
          </p>
          
          <p>
            His videos consistently demonstrate that complex applications can be built without traditional coding knowledge, using AI as the primary development tool. This approach has inspired thousands of creators to begin their own AI development journey.
          </p>
          
          <p>
            The channel serves as both educational resource and inspiration, proving that the barriers to creating software have been dramatically lowered by AI tools, and anyone with ideas can now bring them to life.
          </p>
        </div>
      </div>
    </Layout>
  );
}