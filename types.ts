export interface User {
  id: string;
  name: string;
  age?: number;
  avatarUrl: string;
  city: string;
  state?: string;
  country: string;
  studyLevel: 'Foundation' | 'Reflection' | 'Exploration' | 'Integration';
  interests: string[];
  bio: string;
}

export interface Reply {
  id: string;
  author: User;
  body: string;
  createdAt: string;
  parentId?: string | null;
  imageUrl?: string;
}

export interface Thread {
  id:string;
  title: string;
  body: string;
  author: User;
  tags: string[];
  createdAt: string;
  resonates: number;
  replies: Reply[];
  imageUrl?: string;
}

export interface RoadmapStep {
  id: string;
  title: string;
  type: 'reading' | 'video' | 'reflection' | 'activity';
  description: string;
  link?: string;
}

export interface RoadmapLevel {
  id: string;
  title: 'Foundation' | 'Reflection' | 'Exploration' | 'Integration';
  subtitle: string;
  steps: RoadmapStep[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'Online' | 'Offline';
  startDate: string;
  endDate: string;
  location: string;
  host: User;
  category: string;
  organizer: string;
  language: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  chapters: Chapter[];
}

export interface Note {
  id: string;
  chapterId: string;
  selectedText: string;
  noteText: string;
  start: number;
  end: number;
}

export enum View {
  Discussions = 'Discussions',
  Directory = 'Directory',
  Roadmap = 'Roadmap',
  Events = 'Events',
  Read = 'Read',
  Profile = 'Profile',
}