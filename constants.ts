import { View, Book, User, Thread, RoadmapLevel, Event } from './types';
import { MessageSquareIcon, UsersIcon, MilestoneIcon, CalendarIcon, BookOpenIcon } from './components/icons';

export const NAVIGATION_ITEMS = [
  { id: View.Discussions, label: 'Discussions', icon: MessageSquareIcon },
  { id: View.Directory, label: 'Directory', icon: UsersIcon },
  { id: View.Roadmap, label: 'Roadmap', icon: MilestoneIcon },
  { id: View.Events, label: 'Events', icon: CalendarIcon },
  { id: View.Read, label: 'Read', icon: BookOpenIcon },
];

export const MOCK_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'Manav Vyavahar Darshan',
    author: 'A. Nagraj',
    coverUrl: 'https://i.imgur.com/X54a3sN.jpg',
    description: 'The foundational text on human conduct in Madhyasth Darshan.',
    chapters: Array.from({ length: 18 }, (_, i) => ({
      id: `mvd-${i + 1}`,
      title: `अध्याय ${i + 1}`,
      content: `Content for Chapter ${i + 1} from Manav Vyavahar Darshan will be displayed here.`,
    })),
  },
  {
    id: 'b2',
    title: 'Jeevan Vidya: A Primer',
    author: 'A. Nagraj',
    coverUrl: 'https://madhyasth-darshan.info/wp-content/uploads/2019/07/JV-Primer-Cover-Hi-Res.jpg',
    description: 'An introductory text to the philosophy of Madhyasth Darshan (Jeevan Vidya).',
    chapters: [
      { id: 'c2-1', title: 'Introduction', content: 'Introductory content for Jeevan Vidya: A Primer.' },
    ],
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Anjali Sharma',
    avatarUrl: 'https://picsum.photos/seed/anjali/200/200',
    city: 'Mumbai',
    country: 'India',
    studyLevel: 'Foundation',
    interests: ['Consciousness', 'Philosophy', 'Yoga'],
    bio: 'Student of Jeevan Vidya, exploring the nature of reality and human purpose. Loves hiking and reading.'
  },
  {
    id: 'u2',
    name: 'David Chen',
    avatarUrl: 'https://picsum.photos/seed/david/200/200',
    city: 'San Francisco',
    country: 'USA',
    studyLevel: 'Exploration',
    interests: ['Coexistence', 'Systems Thinking', 'Education'],
    bio: 'Facilitator with 5+ years of experience in Madhyasth Darshan workshops. Passionate about bringing clarity to complex topics.'
  },
  {
    id: 'u3',
    name: 'Maria Garcia',
    avatarUrl: 'https://picsum.photos/seed/maria/200/200',
    city: 'Madrid',
    country: 'Spain',
    studyLevel: 'Reflection',
    interests: ['Family', 'Relationships', 'Psychology'],
    bio: 'New to the study, trying to apply these principles in my daily family life. Looking to connect with others on a similar journey.'
  },
  {
    id: 'u4',
    name: 'Kenji Tanaka',
    avatarUrl: 'https://picsum.photos/seed/kenji/200/200',
    city: 'Tokyo',
    country: 'Japan',
    studyLevel: 'Integration',
    interests: ['Holistic Living', 'Nature', 'Mindfulness'],
    bio: 'Integrating the philosophy into my work as an architect, focusing on sustainable and harmonious design.'
  },
];

export const COMMUNITY_CONTACTS: User[] = [
  { id: 'c-ap-1', name: 'Pradeep R', avatarUrl: 'https://picsum.photos/seed/pradeepr/200/200', city: 'Hyderabad (IIIT)', state: 'Andhra Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9391131199, Email: ramancharla@iiit.ac.in' },
  { id: 'c-cg-1', name: 'Surendra Pal', avatarUrl: 'https://picsum.photos/seed/surendrapal/200/200', city: 'Raipur', state: 'Chhattisgarh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9725025307, Email: surendrapal@hotmail.com' },
  { id: 'c-cg-2', name: 'Chandrashekhar', avatarUrl: 'https://picsum.photos/seed/chandrashekhar/200/200', city: 'Achoti', state: 'Chhattisgarh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9893013341, Email: rathore.civil@gmail.com' },
  { id: 'c-gj-1', name: 'Suresh Patel', avatarUrl: 'https://picsum.photos/seed/sureshpatel/200/200', city: 'Ahmedabad', state: 'Gujarat', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9727682693, Email: sureshbhaipatel@yahoo.com' },
  { id: 'c-gj-2', name: 'Ajay Jain', avatarUrl: 'https://picsum.photos/seed/ajayjain/200/200', city: 'Surat', state: 'Gujarat', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9824304935, Email: akj01936@yahoo.com' },
  { id: 'c-ka-1', name: 'Rakesh Gupta', avatarUrl: 'https://picsum.photos/seed/rakeshgupta/200/200', city: 'Bangalore', state: 'Karnataka', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9611509219, Email: rakesh2715@gmail.com' },
  { id: 'c-ka-2', name: 'Sanjeev Patil', avatarUrl: 'https://picsum.photos/seed/sanjeevpatil/200/200', city: 'Vijaypura (Bijapur)', state: 'Karnataka', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9448231960, Email: tarangscientificinstruments@gmail.com' },
  { id: 'c-mp-1', name: 'Sharada Amba', avatarUrl: 'https://picsum.photos/seed/sharadaamba/200/200', city: 'Amarkantak', state: 'Madhya Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9425344128' },
  { id: 'c-mp-2', name: 'Anand Dammani', avatarUrl: 'https://picsum.photos/seed/ananddammani/200/200', city: 'Indore', state: 'Madhya Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9770127272, Email: anand@galaxyweblinks.com' },
  { id: 'c-mh-1', name: 'Shriram Narasimhan', avatarUrl: 'https://picsum.photos/seed/shriramn/200/200', city: 'Pune', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9907794154, Email: zshriram@gmail.com' },
  { id: 'c-mh-2', name: 'Suvarna Shastri', avatarUrl: 'https://picsum.photos/seed/suvarnas/200/200', city: 'Pune', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9630300787' },
  { id: 'c-mh-3', name: 'Sachin Mote', avatarUrl: 'https://picsum.photos/seed/sachinmote/200/200', city: 'Buldhana', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9404508107' },
  { id: 'c-mh-4', name: 'Mangesh Shastri', avatarUrl: 'https://picsum.photos/seed/mangeshs/200/200', city: 'Mumbai', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9821046342' },
  { id: 'c-mh-5', name: 'Uddhav Rathod', avatarUrl: 'https://picsum.photos/seed/uddhavr/200/200', city: 'Chandrapur', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9158033290' },
  { id: 'c-mh-6', name: 'Rahul Tayde', avatarUrl: 'https://picsum.photos/seed/rahult/200/200', city: 'Yeotmal', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9860774810' },
  { id: 'c-mh-7', name: 'Rekha Raut', avatarUrl: 'https://picsum.photos/seed/rekharaut/200/200', city: 'Akola', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9850156255' },
  { id: 'c-mh-8', name: 'Radheshyam', avatarUrl: 'https://picsum.photos/seed/radheshyam/200/200', city: 'Aurangabad', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 8888855410' },
  { id: 'c-mh-9', name: 'Shalini Arora', avatarUrl: 'https://picsum.photos/seed/shalinia/200/200', city: 'Nagpur', state: 'Maharashtra', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9422805479' },
  { id: 'c-dl-1', name: 'Sanjeev Chopra', avatarUrl: 'https://picsum.photos/seed/sanjeevchopra/200/200', city: 'New Delhi', state: 'NCR Delhi', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9811141311' },
  { id: 'c-od-1', name: 'Gopal Agrawal', avatarUrl: 'https://picsum.photos/seed/gopalagrawal/200/200', city: 'Bargarh', state: 'Odisha', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9437052363, Email: gopal_bgh@yahoo.com' },
  { id: 'c-rj-1', name: 'Himansu Dugar', avatarUrl: 'https://picsum.photos/seed/himansudugar/200/200', city: 'Sardar Shahar', state: 'Rajasthan', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9602411441, Email: hdugar1@rediffmail.com' },
  { id: 'c-rj-2', name: 'Aniruddh Vaishnav', avatarUrl: 'https://picsum.photos/seed/aniruddhv/200/200', city: 'Bhilwara', state: 'Rajasthan', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9461263130' },
  { id: 'c-tn-1', name: 'Senthil', avatarUrl: 'https://picsum.photos/seed/senthil/200/200', city: 'Salem', state: 'Tamil Nadu', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9566876633' },
  { id: 'c-up-1', name: 'Abhishek Kumar', avatarUrl: 'https://picsum.photos/seed/abhishekk/200/200', city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9795781862, Email: abhishkr@gmail.com' },
  { id: 'c-up-2', name: 'Ransingh Arya', avatarUrl: 'https://picsum.photos/seed/ransingha/200/200', city: 'Bijnore', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9412218178, Email: msyatra@gmail.com' },
  { id: 'c-up-3', name: 'Sanjeev Chopra', avatarUrl: 'https://picsum.photos/seed/sanjeevchopra2/200/200', city: 'Hapud', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9412218178, Email: schopra45@yahoo.com' },
  { id: 'c-up-4', name: 'Prem Singh', avatarUrl: 'https://picsum.photos/seed/premsingh/200/200', city: 'Banda', state: 'Uttar Pradesh', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9415557444, Email: farmerprem@gmail.com' },
  { id: 'c-br-1', name: 'Yogesh', avatarUrl: 'https://picsum.photos/seed/yogesh/200/200', city: 'Patna (NIT)', state: 'Bihar', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9410478242, Email: yogesh.me@nitp.ac.in' },
  { id: 'c-jh-1', name: 'Ramashankar', avatarUrl: 'https://picsum.photos/seed/ramashankar/200/200', city: 'Deoghar', state: 'Jharkhand', country: 'India', studyLevel: 'Foundation', interests: [], bio: 'Phone: 9110935465' },
  { id: 'c-ca-1', name: 'Mahendra & Naomi', avatarUrl: 'https://picsum.photos/seed/mahendranaomi/200/200', city: 'Ontario', state: 'Ontario', country: 'Canada', studyLevel: 'Foundation', interests: [], bio: 'Phone: +18185338268' },
];


export const MOCK_THREADS: Thread[] = [
  {
    id: 't1',
    title: 'Understanding the difference between "Knowing" and "Assuming"',
    body: 'I\'ve been pondering the distinction Madhyasth Darshan makes between knowing (jaan-na) and assuming (maan-na). It seems simple on the surface, but the implications are profound. How has this distinction impacted your daily life and decision-making?\n\nFor me, I realize how much of my life is based on assumptions passed down through family and society. It\'s a bit unsettling but also liberating. Looking forward to hearing your thoughts.',
    author: MOCK_USERS[2],
    tags: ['Knowing vs Assuming', 'Jeevan Vidya', 'Self-Exploration'],
    createdAt: '2 days ago',
    resonates: 15,
    replies: [
      {
        id: 'r1',
        author: MOCK_USERS[1],
        body: 'Great question, Maria. This is a foundational point. For me, the shift happened when I started verifying my assumptions against reality, both within myself and in my interactions. It requires a lot of patience and honesty.',
        createdAt: '2 days ago',
        parentId: null
      },
      {
        id: 'r2',
        author: MOCK_USERS[0],
        body: 'I agree with David. It\'s an ongoing process. I find that when I operate from "knowing" (based on my own understanding), my actions are more confident and harmonious. When it\'s just an assumption, there\'s always a subtle undercurrent of doubt or fear.',
        createdAt: '1 day ago',
        parentId: 'r1'
      }
    ]
  },
  {
    id: 't2',
    title: 'Practical application of "Coexistence" in the workplace',
    body: 'My workplace can be very competitive. I\'m struggling to see how the principle of "Coexistence" applies in an environment that seems to reward individual achievement above all else. Has anyone successfully navigated this? Any practical tips or experiences to share?',
    author: MOCK_USERS[0],
    tags: ['Coexistence', 'Workplace', 'Relationships'],
    createdAt: '5 days ago',
    resonates: 8,
    replies: [
        {
            id: 'r3',
            author: MOCK_USERS[1],
            body: 'It\'s definitely a challenge. One small thing I started doing was genuinely appreciating my colleagues\' contributions, even when they "win". It shifted my perspective from a zero-sum game to seeing us as part of a larger system. It didn\'t change the company culture overnight, but it changed my own inner state significantly.',
            createdAt: '4 days ago',
            parentId: null
        }
    ]
  },
  {
    id: 't3',
    title: 'Explaining "Consciousness" (Chaitanya) to a complete beginner',
    body: 'A friend asked me to explain what "Consciousness" or "Chaitanya" means in this philosophy, and I struggled to put it into simple terms without using jargon. How would you explain it? What analogies have you found helpful?',
    author: MOCK_USERS[3],
    tags: ['Consciousness', 'Jargon', 'Teaching'],
    createdAt: '7 days ago',
    resonates: 12,
    replies: [
      {
        id: 'r4',
        author: MOCK_USERS[0],
        body: "I usually start with the idea of 'the observer' or 'the knower' within us. The part that is aware of thoughts, feelings, and the body, but isn't any of those things. It's a starting point, at least!",
        createdAt: '6 days ago',
        parentId: null
      }
    ]
  },
  {
    id: 't4',
    title: 'What does "Resolution" (Samadhan) look like in family life?',
    body: 'The books talk a lot about achieving "Samadhan" or Resolution. I understand it intellectually, but what are some tangible examples of what this looks like in the day-to-day chaos of family life? I\'m particularly interested in how it changes communication during disagreements.',
    author: MOCK_USERS[0],
    tags: ['Resolution', 'Family', 'Relationships', 'Samadhan'],
    createdAt: '10 days ago',
    resonates: 22,
    replies: []
  },
  {
    id: 't5',
    title: 'The role of Nature in our understanding',
    body: 'I find that spending time in nature really helps me connect with the concepts of orderliness, harmony, and coexistence. It feels like a living demonstration of the philosophy. Does anyone else use observations of nature as a tool for their own study and reflection? What have you observed?',
    author: MOCK_USERS[1],
    tags: ['Nature', 'Harmony', 'Coexistence', 'Observation'],
    createdAt: '12 days ago',
    resonates: 18,
    replies: [
      {
        id: 'r5',
        author: MOCK_USERS[3],
        body: 'Absolutely. As an architect, I see the perfect resource management and symbiotic relationships in a forest ecosystem. There is no waste. It\'s a huge inspiration for sustainable design and a reminder of the inherent orderliness in existence.',
        createdAt: '11 days ago',
        parentId: null
      },
      {
        id: 'r6',
        author: MOCK_USERS[2],
        body: 'I love that perspective, Kenji. For me, it\'s as simple as watching my garden. The way plants grow towards the sun, the bees pollinating... it\'s all a quiet dance of purpose and mutual fulfillment.',
        createdAt: '10 days ago',
        parentId: 'r5'
      }
    ]
  }
];

export const MOCK_ROADMAP: RoadmapLevel[] = [
  {
    id: 'l1',
    title: 'Foundation',
    subtitle: 'Understanding the basic proposals of Madhyasth Darshan.',
    steps: [
      {
        id: 's1-1',
        title: 'Introduction to Jeevan Vidya',
        type: 'video',
        description: 'Watch an introductory series of talks on the core concepts of the philosophy.',
        link: 'https://www.youtube.com/playlist?list=PLq-nEFx3fJcEDYs49j0TfW-3qsT582aW3'
      },
      {
        id: 's1-2',
        title: 'Reading: "Manav Vyavahar Darshan"',
        type: 'reading',
        description: 'Begin reading the foundational text on human conduct.'
      },
      {
        id: 's1-3',
        title: 'Weekly Reflection Journal',
        type: 'reflection',
        description: 'At the end of each week, write down one key insight and how it relates to your daily experiences.'
      }
    ]
  },
  {
    id: 'l2',
    title: 'Reflection',
    subtitle: 'Internalizing concepts through self-observation.',
    steps: [
      {
        id: 's2-1',
        title: 'Activity: Observe Your Reactions',
        type: 'activity',
        description: 'For one week, consciously observe your emotional reactions without judgment. Note the triggers and the underlying assumptions.'
      },
      {
        id: 's2-2',
        title: 'Reading: "Karm Darshan"',
        type: 'reading',
        description: 'Study the text related to action (Karma) and its results.'
      },
    ]
  },
  {
    id: 'l3',
    title: 'Exploration',
    subtitle: 'Discussing and verifying proposals with others.',
    steps: [
      {
        id: 's3-1',
        title: 'Join a Study Group',
        type: 'activity',
        description: 'Engage in a weekly study circle to discuss your readings and reflections with peers.'
      },
      {
        id: 's3-2',
        title: 'Video Series: Deep Dive on Consciousness',
        type: 'video',
        description: 'Watch advanced talks on the nature of the Self (Jeevan) and Consciousness.',
      },
    ]
  },
  {
    id: 'l4',
    title: 'Integration',
    subtitle: 'Living in harmony based on understanding.',
    steps: [
      {
        id: 's4-1',
        title: 'Activity: Mentoring',
        type: 'activity',
        description: 'Share your understanding by helping facilitate a study group for beginners.'
      },
      {
        id: 's4-2',
        title: 'Reflection: The Undivided Society',
        type: 'reflection',
        description: 'Contemplate on your role and contribution towards creating a harmonious, undivided society.'
      },
    ]
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e4',
    title: 'अष्टम त्रि-वर्षीय अध्ययन अभ्यास सत्र',
    description: 'A three-year study and practice session.',
    type: 'Offline',
    startDate: '10/07/2025',
    endDate: '26/07/2028',
    location: 'Kiritpur, Post, Ranka, Chhattisgarh',
    host: MOCK_USERS[1],
    category: 'B1. Adhyayan Shivir (Pustak)',
    organizer: 'Multiple',
    language: 'Hindi [ हिन्दी ]',
  },
  {
    id: 'e1',
    title: '7-Day Introductory Workshop on Jeevan Vidya',
    description: 'An immersive online workshop covering the foundational principles of Madhyasth Darshan. Ideal for beginners.',
    type: 'Online',
    startDate: 'October 15, 2024',
    endDate: 'October 21, 2024',
    location: 'Zoom',
    host: MOCK_USERS[1],
    category: 'C2. Workshop (Introductory)',
    organizer: MOCK_USERS[1].name,
    language: 'English & Hindi',
  },
  {
    id: 'e2',
    title: 'Mumbai Study Circle Meetup',
    description: 'A monthly offline gathering for students in the Mumbai area to discuss texts and share experiences.',
    type: 'Offline',
    startDate: 'October 26, 2024',
    endDate: '',
    location: 'Andheri Community Hall, Mumbai',
    host: MOCK_USERS[0],
    category: 'A1. Study Circle',
    organizer: 'Mumbai Study Group',
    language: 'Hindi',
  },
  {
    id: 'e3',
    title: 'Advanced Course: "Manav Abhyas Darshan"',
    description: 'A deep-dive course for experienced students focusing on the text related to human practice and experience.',
    type: 'Online',
    startDate: 'November 5, 2024',
    endDate: 'November 9, 2024',
    location: 'Google Meet',
    host: MOCK_USERS[3],
    category: 'B2. Advanced Course',
    organizer: MOCK_USERS[3].name,
    language: 'English',
  }
];