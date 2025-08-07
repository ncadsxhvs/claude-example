import Layout from '@/components/ui/Layout';
import Comments from '@/components/comments/Comments';

export default function Home() {
  return (
    <Layout>
      <div className="mb-12">
        <div className="text-center mb-12">
          <p className="text-lg leading-relaxed text-gray-700 max-w-lg mx-auto">
            The #1 AI educator with 8.7M likes and 616.8K followers on TikTok. 
            Co-founder of VibeCode, making $125K/month teaching people how to use AI tools 
            to better communicate with the world digitally.
          </p>
        </div>
      </div>
      
      <Comments />
    </Layout>
  );
}
