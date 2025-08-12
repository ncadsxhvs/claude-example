export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Comment {
  id: string;
  content: string;
  author: {
    uid: string;
    name: string;
    photoURL: string;
  };
  likes: string[];
  timestamp: any; // Firestore Timestamp
  page: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<any>;
  signOut: () => Promise<void>;
}