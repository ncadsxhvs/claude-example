import Layout from '@/components/ui/Layout';
import Comments from '@/components/comments/Comments';

export default function Home() {
  return (
    <Layout>
      <div className="mb-12">
        <div className="text-center mb-12">
          <p className="text-lg leading-relaxed text-gray-700 max-w-2xl mx-auto">
            Senior Product Manager & Data Engineering Manager with 5+ years of experience leading 
            cross-functional teams in healthcare technology and AI-driven product development. 
            Passionate about building data-driven solutions that drive measurable business outcomes 
            and improve operational efficiency.
          </p>
        </div>
      </div>
      
      <Comments />
    </Layout>
  );
}
