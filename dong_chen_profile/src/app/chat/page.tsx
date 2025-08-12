import Layout from '@/components/ui/Layout';
import RAGChatInterface from '@/components/chat/RAGChatInterface';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <Layout showNavigation={false}>
      <Link 
        href="/" 
        className="fixed top-10 left-10 text-gray-600 hover:text-gray-800 transition-colors duration-300 z-10"
      >
        ← Back
      </Link>
      
      <div className="max-w-5xl mx-auto pt-20">
        <h1 className="text-5xl font-light mb-10 text-gray-900 tracking-tight text-center">
          Chat with Dong
        </h1>
        
        <RAGChatInterface />
      </div>
    </Layout>
  );
}