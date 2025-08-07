'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { Comment } from '@/types';
import Image from 'next/image';

export default function Comments() {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'comments'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || loading) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'comments'), {
        content: newComment.trim(),
        author: {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
        },
        likes: [],
        timestamp: new Date(),
        page: 'home',
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      const commentRef = doc(db, 'comments', commentId);
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <section className="mt-16 pt-10 border-t border-gray-200">
      <h2 className="text-3xl font-normal mb-8 text-gray-800 text-center">
        Community Discussion
      </h2>
      
      <form onSubmit={handleSubmit} className="mb-10 flex flex-col gap-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts about AI, Riley's content, or ask questions..."
          className="p-4 border border-gray-300 rounded-lg font-inherit text-base resize-none min-h-[80px] leading-relaxed focus:outline-none focus:border-blue-600"
          maxLength={500}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="self-start bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-y-px disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
      
      <div className="flex flex-col gap-6">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={user.uid}
            onToggleLike={toggleLike}
          />
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to start the discussion!</p>
          </div>
        )}
      </div>
    </section>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onToggleLike: (commentId: string, isLiked: boolean) => void;
}

function CommentItem({ comment, currentUserId, onToggleLike }: CommentItemProps) {
  const isLiked = comment.likes.includes(currentUserId);
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex gap-3 p-5 bg-black/[0.02] rounded-xl">
      {comment.author.photoURL && (
        <Image
          src={comment.author.photoURL}
          alt={comment.author.name}
          width={40}
          height={40}
          className="rounded-full flex-shrink-0"
        />
      )}
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-800">
            {comment.author.name}
          </span>
          <span className="text-sm text-gray-500">
            {formatTimestamp(comment.timestamp)}
          </span>
        </div>
        
        <p className="mb-3 leading-relaxed text-gray-700">
          {comment.content}
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={() => onToggleLike(comment.id, isLiked)}
            className={`flex items-center gap-1 px-3 py-1.5 border rounded-full text-sm transition-all duration-300 ${
              isLiked
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-blue-50 hover:border-blue-600'
            }`}
          >
            👍 {comment.likes.length}
          </button>
        </div>
      </div>
    </div>
  );
}