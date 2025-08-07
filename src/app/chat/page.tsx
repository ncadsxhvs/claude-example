import Layout from '@/components/ui/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ChatInterface from '@/components/chat/ChatInterface';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <Layout showNavigation={false}>
      <ProtectedRoute>
        <Link 
          href="/" 
          className="fixed top-10 left-10 text-gray-600 hover:text-gray-800 transition-colors duration-300 z-10"
        >
          ← Back
        </Link>
        
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-light mb-10 text-gray-900 tracking-tight text-center">
            Chat with Riley
          </h1>
          
          <ChatInterface />
        </div>
      </ProtectedRoute>
    </Layout>
  );
}