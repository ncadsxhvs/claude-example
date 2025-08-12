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
          About Dong
        </h1>
        
        <div className="prose prose-lg text-gray-700 space-y-6">
          <p>
            Dong Chen is a seasoned Senior Product Manager and Data Engineering Manager with over 5 years of experience leading cross-functional teams in healthcare technology and AI-driven product development. He brings a unique blend of technical expertise and business acumen to drive measurable outcomes through innovative data solutions.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Professional Journey
          </h3>
          <p>
            Currently at ThinkResearch since November 2019, Dong has led the design and delivery of an Internal AI Knowledge & Virtual Care Platform leveraging RAG architecture (LLM + vector database). This revolutionary platform has improved provider response time by 40% and significantly reduced onboarding effort for clinical teams.
          </p>
          
          <p>
            His career trajectory showcases diverse technical experience: from Software Developer at Intel, to Full Stack Engineer at Geotab, and Business Analyst at PingAn E-commerce. This broad foundation has equipped him with comprehensive understanding of both technical implementation and business strategy.
          </p>
          
          <h3 className="text-2xl font-normal mt-10 mb-5 text-gray-800">
            Education & Expertise
          </h3>
          <p>
            Dong holds an Honors Bachelor of Computer Science with Software Engineering Specialist from University of Toronto (2009-2016) and a Master of Management Analytics from Queen's University Smith School of Business (2022-2023). This combination of technical depth and business analytics expertise enables him to bridge the gap between complex technical solutions and business value.
          </p>
          
          <div className="bg-black/[0.02] rounded-xl p-8 my-10 text-center">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">70%</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Cost Reduction</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">40%</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Response Time Improvement</div>
              </div>
              <div>
                <div className="text-3xl font-normal text-gray-900 mb-1">20%</div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">Revenue Increase</div>
              </div>
            </div>
          </div>
          
          <p>
            Dong's approach focuses on data-driven decision making, process optimization, and building AI-driven solutions that solve real-world business problems. He excels at leading cross-functional teams and translating complex technical concepts into actionable business strategies.
          </p>
        </div>
      </div>
    </Layout>
  );
}