import Layout from '@/components/ui/Layout';
import Link from 'next/link';

export default function ExperiencePage() {
  return (
    <Layout showNavigation={false}>
      <Link 
        href="/" 
        className="fixed top-10 left-10 text-gray-600 hover:text-gray-800 transition-colors duration-300 z-10"
      >
        ← Back
      </Link>
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-light mb-10 text-gray-900 tracking-tight">
          Professional Experience
        </h1>
        
        <div className="prose prose-lg text-gray-700 space-y-8">
          <div className="border-l-4 border-blue-600 pl-6 py-4">
            <h3 className="text-2xl font-normal mb-2 text-gray-800">ThinkResearch</h3>
            <div className="text-sm text-gray-600 mb-1">Data & Engineering Manager / Product Manager</div>
            <div className="text-sm text-gray-500 mb-4">Nov 2019 – Present | Remote</div>
            <ul className="space-y-2 text-base">
              <li>Led the design and delivery of an Internal AI Knowledge & Virtual Care Platform leveraging RAG architecture (LLM + vector db) to empower clinical teams</li>
              <li>Improved provider response time by 40% and reduced onboarding effort through AI-driven solutions</li>
              <li>Optimized data pipelines across multiple environments, reducing platform costs by over 70% and increasing revenue by 20%</li>
              <li>Led cross-functional teams of data engineers and business intelligence experts</li>
              <li>Extensive experience with Tableau, Looker Studio, and Qlik BI tools</li>
            </ul>
          </div>

          <div className="border-l-4 border-gray-400 pl-6 py-4">
            <h3 className="text-2xl font-normal mb-2 text-gray-800">ThinkResearch</h3>
            <div className="text-sm text-gray-600 mb-1">Data Engineer</div>
            <div className="text-sm text-gray-500 mb-4">Nov 2018 – October 2019</div>
            <ul className="space-y-2 text-base">
              <li>Led development of a Data Ingestion Platform using microservices architecture</li>
              <li>Centralized healthcare data from diverse sources (RDBMS, Google Sheets, documents)</li>
              <li>Significantly improved performance and data upload speed from large-scale RDBMS clusters to data warehouse</li>
            </ul>
          </div>

          <div className="border-l-4 border-gray-400 pl-6 py-4">
            <h3 className="text-2xl font-normal mb-2 text-gray-800">Geotab</h3>
            <div className="text-sm text-gray-600 mb-1">Full Stack Software Engineer</div>
            <div className="text-sm text-gray-500 mb-4">February 2017 – October 2018</div>
            <ul className="space-y-2 text-base">
              <li>Led development of a Data Ingestion Platform using microservices architecture for geospatial data</li>
              <li>Re-engineered internal CMS application workflows, achieving 70% acceleration in shipping operations</li>
              <li>Optimized API calls and implemented multi-threading and asynchronous functions</li>
            </ul>
          </div>

          <div className="border-l-4 border-gray-400 pl-6 py-4">
            <h3 className="text-2xl font-normal mb-2 text-gray-800">Intel</h3>
            <div className="text-sm text-gray-600 mb-1">Software Developer Intern</div>
            <div className="text-sm text-gray-500 mb-4">June 2011 – June 2012</div>
            <ul className="space-y-2 text-base">
              <li>Designed and implemented a data management system to monitor devices in production environments</li>
              <li>Enhanced data visibility and operational efficiency across production systems</li>
            </ul>
          </div>

          <div className="border-l-4 border-gray-400 pl-6 py-4">
            <h3 className="text-2xl font-normal mb-2 text-gray-800">PingAn E-commerce Payment Department</h3>
            <div className="text-sm text-gray-600 mb-1">Business Analyst</div>
            <div className="text-sm text-gray-500 mb-4">June 2014 – June 2015</div>
            <ul className="space-y-2 text-base">
              <li>Optimized workflows for offshore business asset investment processes</li>
              <li>Improved operational efficiency and decision-making through data analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}