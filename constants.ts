import { View, User, Thread, Reply, RoadmapLevel, Event } from './types';
import { MessageSquareIcon, UsersIcon, MilestoneIcon, CalendarIcon } from './components/icons';

export const NAVIGATION_ITEMS = [
  { id: View.Discussions, label: 'Discussions', icon: MessageSquareIcon },
  { id: View.Directory, label: 'Directory', icon: UsersIcon },
  { id: View.Roadmap, label: 'Roadmap', icon: MilestoneIcon },
  { id: View.Events, label: 'Events', icon: CalendarIcon },
];

const user1: User = { id: 'u1', name: 'A. Nagraj', avatarUrl: 'https://picsum.photos/seed/u1/100/100', city: 'Amarkantak', country: 'India', studyLevel: 'Integration', interests: ['Coexistence', 'Consciousness'], bio: 'Propounder of Madhyasth Darshan (Coexistentialism).' };
const user2: User = { id: 'u2', name: 'Jane Doe', avatarUrl: 'https://picsum.photos/seed/u2/100/100', city: 'San Francisco', country: 'USA', studyLevel: 'Foundation', interests: ['Jeevan Vidya', 'Family Harmony'], bio: 'Student of philosophy, exploring ways to live a more harmonious life.' };
const user3: User = { id: 'u3', name: 'Rakesh Gupta', avatarUrl: 'https://picsum.photos/seed/u3/100/100', city: 'Delhi', country: 'India', studyLevel: 'Exploration', interests: ['Education', 'Self-Exploration'], bio: 'Facilitator for Jeevan Vidya workshops.' };

export const MOCK_USERS: User[] = [user1, user2, user3,
  { id: 'u4', name: 'Li Wei', avatarUrl: 'https://picsum.photos/seed/u4/100/100', city: 'Shanghai', country: 'China', studyLevel: 'Reflection', interests: ['Philosophy', 'Systems Thinking'], bio: 'Exploring the intersection of eastern philosophy and modern science.' },
  { id: 'u5', name: 'Maria Garcia', avatarUrl: 'https://picsum.photos/seed/u5/100/100', city: 'Madrid', country: 'Spain', studyLevel: 'Foundation', interests: ['Mindfulness', 'Community Building'], bio: 'New to Madhyasth Darshan, eager to learn and connect.' }
];


const reply1: Reply = { id: 'r1', author: user2, body: 'This is a very insightful question. My understanding is that "seeing" refers to the direct apprehension of reality as it is, without the filter of assumptions or beliefs. It\'s the clarity that arises from self-exploration.', createdAt: '2 hours ago', parentId: null };
const reply2: Reply = { id: 'r2', author: user3, body: 'Excellent point, Jane. To add to that, in Jeevan Vidya workshops, we often discuss this as the difference between "maanana" (assuming) and "jaanna" (knowing). The entire process is a journey from assuming to knowing, and "seeing" is the culmination of knowing.', createdAt: '1 hour ago', parentId: null };
const reply3: Reply = { id: 'r3', author: user2, body: 'Thank you, Rakesh! That\'s a great way to put it. The "jaanna" aspect really clarifies the goal.', createdAt: '45 mins ago', parentId: 'r2' };
const reply4: Reply = { id: 'r4', author: user1, body: 'Indeed. The journey is the key. Darshan is not a one-time event but a continuous process of alignment.', createdAt: '30 mins ago', parentId: 'r2' };
const reply5: Reply = { id: 'r5', author: user3, body: 'Precisely. And that continuous alignment is what leads to harmony within oneself and with existence.', createdAt: '15 mins ago', parentId: 'r4' };


export const MOCK_THREADS: Thread[] = [
  {
    id: 't1',
    title: 'What is the meaning of "seeing" (darshan) in context of reality?',
    body: 'The philosophy is called "Madhyasth Darshan," which translates to Coexistential Vision or Resolutional Vision. I\'m trying to understand the depth of the word "darshan" or "seeing" here. Is it a metaphorical seeing, an intellectual understanding, or something else entirely? How have others grappled with this concept in their study?',
    author: user2,
    tags: ['Darshan', 'Core Concepts', 'Self-Exploration'],
    createdAt: 'Yesterday',
    resonates: 12,
    replies: [reply1, reply2, reply3, reply4, reply5]
  },
  {
    id: 't2',
    title: 'Practical application of "Nyaya" (Justice) in family relationships',
    body: 'The concept of justice (nyaya) in relationships is defined as: recognition of relationship, fulfillment of values, mutual happiness. This sounds profound, but how does it look in daily life? For example, during a disagreement with a spouse or a child. Would love to hear some real-life examples.',
    author: user3,
    tags: ['Nyaya', 'Relationships', 'Family'],
    createdAt: '3 days ago',
    resonates: 25,
    replies: []
  }
];

export const MOCK_ROADMAP: RoadmapLevel[] = [
  {
    id: 'rl1', title: 'Foundation', subtitle: 'Get Acquainted (Parichay)',
    steps: [
      { id: 's1', type: 'activity', title: 'Attend an Introductory Workshop (Parichay Shivir)', description: 'The primary way to get acquainted with the proposal. This is typically a 7-day workshop.' },
      { id: 's2', type: 'reading', title: 'Read "Jeevan Vidya: A Primer"', description: 'A concise introduction to the core concepts and terminology.' },
      { id: 's3', type: 'video', title: 'Watch Introductory Video Series', description: 'Listen to or watch recordings of Parichay Shivirs to reinforce understanding.' },
    ]
  },
  {
    id: 'rl2', title: 'Reflection', subtitle: 'Contemplate the Proposal (Manan)',
    steps: [
       { id: 's4', type: 'activity', title: 'Join a Weekly Study Group (Adhyayan Vritt)', description: 'Regularly discuss the literature with peers to deepen your contemplation.' },
       { id: 's5', type: 'reading', title: 'Primary Reading: The Darshans', description: 'Read the core philosophical texts in the following order: Manav Vyavhar, Karma, Abhyas, and Anubhav Darshan.' },
       { id: 's6', type: 'reading', title: 'Secondary Reading: The Vads', description: 'Explore supplementary texts like Vyavharvadi Samajshastra and Avartansheel Arthshastra.' },
       { id: 's7', type: 'reflection', title: 'Reflect on Key Concepts', description: 'Maintain a journal to note your questions, insights, and shifts in understanding as you read and discuss.'}
    ]
  },
   {
    id: 'rl3', title: 'Exploration', subtitle: 'Practice Living in Understanding (Abhyas)',
    steps: [
      { id: 's8', type: 'reflection', title: 'Practice Self-Awareness', description: 'Observe your imagination (thoughts, feelings) and verify them against the proposal. Are they based on assumption or understanding?' },
      { id: 's9', type: 'activity', title: 'Live with Right Understanding in Family', description: 'Apply the principles of justice, trust, and respect in your relationships. Observe the outcomes.' },
      { id: 's10', type: 'activity', title: 'Engage in Societal Systems', description: 'Participate in systems like education and production with the goal of mutual fulfillment, not just personal gain.' },
    ]
  },
  {
    id: 'rl4', title: 'Integration', subtitle: 'Realization of Coexistence (Anubhav)',
    steps: [
      { id: 's11', type: 'reflection', title: 'Realization & Authentication', description: 'The culmination of the process is the direct realization and authentication of coexistence.' },
      { id: 's12', type: 'reflection', title: 'Live with Universal Human Conduct (Manaviya Acharan)', description: 'Your behavior naturally becomes definite and universally harmonious as a result of realization.' },
    ]
  }
];

export const MOCK_EVENTS: Event[] = [
    {
        id: 'e1',
        title: '7-Day Introductory Jeevan Vidya Workshop',
        description: 'An immersive workshop covering the foundational principles of Madhyasth Darshan.',
        type: 'Offline',
        startDate: '2024-09-15',
        endDate: '2024-09-22',
        location: 'Kanpur, India',
        host: user3
    },
    {
        id: 'e2',
        title: 'Weekly Online Study Group',
        description: 'A weekly online meeting to read and discuss "Manav Vyavahar Darshan". Open to all levels.',
        type: 'Online',
        startDate: 'Every Tuesday',
        endDate: '',
        location: 'Zoom',
        host: user2
    }
];