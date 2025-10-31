export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  city: string;
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
}

export interface Thread {
  id: string;
  title: string;
  body: string;
  author: User;
  tags: string[];
  createdAt: string;
  resonates: number;
  replies: Reply[];
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
}

export enum View {
  Discussions = 'Discussions',
  Directory = 'Directory',
  Roadmap = 'Roadmap',
  Events = 'Events'
}