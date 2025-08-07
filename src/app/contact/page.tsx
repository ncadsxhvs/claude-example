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
            Connect with Dong Chen for product management, data engineering, and AI-driven solution opportunities. Open to discussing healthcare technology, data platforms, and collaborative projects.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Contact Information
          </h3>
          <p>
            <strong>Email</strong>: ncadsxhus@gmail.com - Primary contact for professional inquiries, collaboration opportunities, and technical discussions.
          </p>
          
          <p>
            <strong>Phone</strong>: (985) 973-3369 - Available for urgent matters and direct communication regarding project opportunities.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Professional Focus Areas
          </h3>
          <p>
            <strong>Healthcare Technology</strong> - AI-driven platforms for clinical teams, virtual care solutions, and healthcare data management systems.
          </p>
          
          <p>
            <strong>Data Engineering</strong> - Scalable data pipelines, ETL optimization, microservices architecture, and data platform cost optimization.
          </p>
          
          <p>
            <strong>Product Management</strong> - Cross-functional team leadership, AI product development, and business outcome optimization.
          </p>
          
          <p>
            <strong>AI & Machine Learning</strong> - RAG architecture implementation, LLM integration, vector databases, and AI-driven business solutions.
          </p>
          
          <div className="bg-black/[0.02] rounded-xl p-8 my-10 text-center">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">5+</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Years Experience</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">70%</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Cost Reduction</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">Remote</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Work Ready</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Collaboration Interests
          </h3>
          <p>
            Open to discussing opportunities in healthcare technology, AI platform development, data engineering leadership roles, and product management positions.
          </p>
          
          <p>
            Particularly interested in projects involving RAG architecture, clinical data platforms, and AI solutions that drive measurable business outcomes.
          </p>
          
          <p>
            Available for consulting on data pipeline optimization, AI product strategy, and cross-functional team leadership in tech-forward organizations.
          </p>
        </div>
      </div>
    </Layout>
  );
}