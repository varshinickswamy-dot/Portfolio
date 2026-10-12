/* ============================================================
   PORTFOLIO DATA. Edit this block to update the whole site.
   Every fact comes from the resume or the public GitHub repos.
   ============================================================ */

const GH = 'https://github.com/varshinickswamy-dot';
const LINKS = {
  github: GH,
  repos: GH + '?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/varshini-m-c-319a7a2a6',
  email: 'varshinimc10@gmail.com',
  phone: '+91 7411161714'
};

interface Project {
  id: string; name: string; sector: string; featured: boolean;
  status: string; repo: string | null; tags: string[]; summary: string;
  arch: string[]; archNote: string; stack: string[]; pitch: Line[];
}

const PROJECTS: Project[] = [
  {
    id: 'student', name: 'Student Management System', sector: 'Education', featured: true,
    status: 'Academic project', repo: null, tags: ['Java'],
    summary: 'A database-driven web app for managing student records, with separate Admin and Student dashboards and role-based access.',
    arch: ['Browser forms', 'Servlet', 'JDBC', 'MySQL', 'JSP views'],
    archNote: 'Servlets route each request by role, JDBC reads and writes MySQL, JSP renders the page.',
    stack: ['Java', 'Servlets', 'JSP', 'JDBC', 'MySQL'],
    pitch: lines([
      'The Student Management System is a Servlet and JSP application where admins and students get separate dashboards with role based access.',
      'Admins can view, update and delete student records through JDBC and MySQL, and students manage their own profile.'
    ])
  },
  {
    id: 'fraud', name: 'Online Payment Fraud Detection', sector: 'FinTech', featured: true,
    status: 'Public repository', repo: GH + '/Online-Payment-Fraud-Detection-', tags: ['Python', 'AI & ML'],
    summary: 'Flags fraudulent transactions by analysing patterns, comparing three classifiers and serving the trained model from a web app.',
    arch: ['Transactions', 'Preprocessing', 'Model comparison', 'Evaluation', 'Saved model + app.py'],
    archNote: 'Logistic Regression, Random Forest and Decision Tree, scored on accuracy, precision, recall and a confusion matrix.',
    stack: ['Python', 'scikit-learn', 'pandas', 'NumPy', 'Matplotlib'],
    pitch: lines([
      'Online Payment Fraud Detection compares Logistic Regression, Random Forest and Decision Tree models on labelled transactions, and evaluates them with accuracy, precision, recall and a confusion matrix.',
      'The trained model and scaler are saved and used by a web app.'
    ])
  },
  {
    id: 'cancer', name: 'Cancer Type Detection with Report Generation', sector: 'HealthTech', featured: true,
    status: 'Public repository', repo: GH + '/Cancer_Type_Detection_using_image_and_report_generation', tags: ['Python', 'AI & ML'],
    summary: 'A CNN that classifies medical images, with training scripts for breast, lung and skin images, plus Grad-CAM and PDF report modules.',
    arch: ['Medical images', 'Balance + normalise', 'CNN per organ', 'Grad-CAM', 'PDF report + app'],
    archNote: 'Separate training scripts per image type, with an app entry point and a report generator.',
    stack: ['Python', 'Keras', 'TensorFlow', 'OpenCV', 'NumPy'],
    pitch: lines([
      'Cancer Type Detection uses a convolutional neural network to classify medical images, with separate training scripts for breast, lung and skin images.',
      'The repository also includes Grad-CAM and PDF report modules, so the result can be explained and shared.'
    ])
  },
  {
    id: 'anime', name: 'AnimeFlix', sector: 'Media', featured: true,
    status: 'Public repository', repo: GH + '/AnimeFlix', tags: ['JavaScript'],
    summary: 'A Netflix-style anime streaming interface: browse trending shows, search, watch trailers and keep a watchlist.',
    arch: ['React + Vite UI', 'api.js', 'Anime APIs', 'server.js', 'Routes + models'],
    archNote: 'Home, detail, watchlist and continue-watching views, plus login, register and admin screens.',
    stack: ['JavaScript', 'React', 'Vite', 'Node.js', 'CSS'],
    pitch: lines([
      'AnimeFlix is a Netflix style streaming interface for anime.',
      'It has a React and Vite front end with home, detail, watchlist and continue watching views, plus login, register and admin screens.',
      'Data comes from anime APIs, and a server file with routes and models sits alongside.'
    ])
  },
  {
    id: 'voting', name: 'Online Voting System', sector: 'Civic tech', featured: true,
    status: 'Public repository', repo: GH + '/Online-Voting-System', tags: ['Python', 'JavaScript'],
    summary: 'Registered users vote online while administrators manage candidates and results. One vote per user, counted in real time.',
    arch: ['Register + login', 'Cast one vote', 'Live counting', 'Admin dashboard'],
    archNote: 'Voter, candidate and admin flows, with face and video helper modules in the repository.',
    stack: ['Python', 'Flask', 'HTML', 'CSS', 'JavaScript'],
    pitch: lines([
      'The Online Voting System lets registered users vote online while administrators manage candidates and results.',
      'It allows one vote per user and counts votes in real time on an admin dashboard.'
    ])
  },
  {
    id: 'ransom', name: 'Ransomware Detection', sector: 'Cybersecurity', featured: false,
    status: 'Public repository', repo: GH + '/Ransomware-Detection', tags: ['Python', 'AI & ML'],
    summary: 'Watches behavioural signals such as rapid file changes and abnormal encryption to warn before large-scale data loss.',
    arch: ['System activity', 'Feature extraction', 'Classifier', 'Alert via app.py'],
    archNote: 'Trains on a ransomware dataset and checks new behaviour with a saved model.',
    stack: ['Python', 'scikit-learn', 'pandas', 'NumPy'],
    pitch: lines(['Ransomware Detection watches behavioural signals such as rapid file changes and abnormal encryption.'])
  },
  {
    id: 'water', name: 'Smart Water Monitoring and Leakage Detection', sector: 'Sustainability', featured: false,
    status: 'Academic project', repo: null, tags: ['AI & ML'],
    summary: 'A major project exploring AI and smart technologies to monitor water conditions and spot potential leaks.',
    arch: ['Monitoring', 'Leak identification', 'Timely insights'],
    archNote: 'Aimed at water conservation and sustainable resource management.',
    stack: ['Artificial Intelligence', 'Smart technologies'],
    pitch: lines(['Smart Water Monitoring explores AI to monitor water conditions and identify potential leaks.'])
  },
  {
    id: 'cartoon', name: 'Cartoonify Image', sector: 'Image processing', featured: false,
    status: 'Public repository', repo: GH + '/Cartoonify-Image', tags: ['Python'],
    summary: 'A web app that turns an uploaded photo into a cartoon-style image using edge detection and colour smoothing.',
    arch: ['Upload', 'Edge detection', 'Colour smoothing', 'Cartoon image'],
    archNote: 'A small Python web app that returns the result instantly.',
    stack: ['Python', 'Image processing'],
    pitch: lines(['Cartoonify Image turns an uploaded photo into a cartoon using edge detection and colour smoothing.'])
  }
];

const INTRO: Line[] = lines([
  "Hello, and welcome. I'm the AI host of this portfolio.",
  "Let me introduce Varshini M C.",
  "Varshini is an aspiring Java developer based in Bengaluru, and a Java full stack development intern at Dhee Coding Lab.",
  "She studies Information Science and Engineering at Vivekananda Institute of Engineering, with a CGPA of 9.24.",
  "Her core stack is Java, Servlets, JSP, JDBC and MySQL, and she also builds machine learning projects for fraud detection, medical imaging and cyber security.",
  "Scroll down to explore her work, or start the audio tour and I will guide you."
]);

interface TourStep { target: string; block: 'start' | 'center'; title: string; lines: Line[] }

const TOUR: TourStep[] = ([
  {
    target: 'about', block: 'start', title: 'About Varshini', lines: lines([
      'Varshini is a Java developer in the making.',
      'She builds database driven web applications with Java, Servlets, JSP, JDBC and MySQL.',
      'Since July 2026 she has been a Java full stack development intern at Dhee Coding Lab.'
    ])
  },
  {
    target: 'skills', block: 'start', title: 'Skills matrix', lines: lines([
      'This is her skills matrix, grouped into Java backend, SQL and databases, web front end, and applied AI.',
      'Each bar is a self assessed level, and each group links to the projects that show the skill.',
      'She is comfortable with SQL beyond the basics: joins, CTEs, indexes, triggers, stored procedures and window functions.'
    ])
  }
] as TourStep[]).concat(
  PROJECTS.filter((p) => p.featured).map((p) => ({ target: 'proj-' + p.id, block: 'center' as 'center', title: p.name, lines: p.pitch }))
).concat(([
  {
    target: 'experience', block: 'start', title: 'Experience', lines: lines([
      'At Dhee Coding Lab, Varshini builds CRUD applications with Java and MySQL and sharpens her debugging.',
      'Before that, she scored 90 point 16 percent in pre university and 96 point 32 percent in SSLC.'
    ])
  },
  {
    target: 'contact', block: 'start', title: 'Contact', lines: lines([
      'That is the tour. You can reach Varshini by email, or find her on LinkedIn and GitHub.',
      'Thank you for visiting.'
    ])
  }
] as TourStep[]));

interface Ask { label: string; target: string; lines: Line[] }
const ASKS: Ask[] = [
  { label: 'Who is Varshini?', target: 'hero', lines: INTRO },
  {
    label: 'Why hire her?', target: 'projects', lines: lines([
      'She combines a solid Java and SQL foundation with real projects across finance, healthcare, security and civic technology.',
      'She already works with Servlets, JSP, JDBC and MySQL as a full stack intern, and she ships trained machine learning models inside working applications.',
      'She is open to internships and entry level roles in Bengaluru.'
    ])
  },
  {
    label: 'Her tech stack', target: 'skills', lines: lines([
      'On the backend, Core Java, Servlets, JSP and JDBC with MySQL.',
      'On the front end, HTML, CSS, JavaScript and React.',
      'For AI work, Python with scikit-learn, Keras and OpenCV, and Flask for web apps.'
    ])
  },
  {
    label: 'How to reach her', target: 'contact', lines: lines([
      'Email is the quickest way. The address is on the contact section, with a copy button.',
      'You can also open her LinkedIn and GitHub from the same section.'
    ])
  }
];

interface Skill { n: string; l: number; note: string }
interface SkillGroup { id: string; name: string; blurb: string; skills: Skill[]; proof: string[] }

const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'java', name: 'Java backend', blurb: 'The core of her work.', proof: ['student', 'voting'],
    skills: [
      { n: 'Core Java and OOP', l: 82, note: 'Encapsulation, inheritance, polymorphism, abstraction' },
      { n: 'Collections', l: 78, note: 'List, Set, Map, ArrayList, LinkedList, HashSet, HashMap' },
      { n: 'Exceptions and threads', l: 72, note: 'Custom exceptions, multithreading, string handling' },
      { n: 'Servlets and JSP', l: 74, note: 'Role-based dashboards' },
      { n: 'JDBC', l: 76, note: 'Java to MySQL connectivity' }
    ]
  },
  {
    id: 'db', name: 'SQL and databases', blurb: 'Beyond basic queries.', proof: ['student'],
    skills: [
      { n: 'MySQL and CRUD', l: 80, note: 'Create, read, update, delete' },
      { n: 'Joins and subqueries', l: 78, note: 'Multi-table queries' },
      { n: 'Views and CTEs', l: 72, note: 'Readable, reusable queries' },
      { n: 'Indexes, triggers, procedures', l: 68, note: 'Performance and automation' },
      { n: 'Window functions', l: 66, note: 'Ranking and running totals' }
    ]
  },
  {
    id: 'web', name: 'Web front end', blurb: 'Responsive and accessible.', proof: ['anime', 'voting'],
    skills: [
      { n: 'HTML5 and semantic markup', l: 84, note: 'Structure that reads well' },
      { n: 'CSS3 and responsive design', l: 80, note: 'Layouts that adapt' },
      { n: 'Forms and validation', l: 76, note: 'Clean input handling' },
      { n: 'JavaScript', l: 66, note: 'Interactive interfaces' },
      { n: 'React and Vite', l: 55, note: 'Used in AnimeFlix' }
    ]
  },
  {
    id: 'ml', name: 'Applied AI and ML', blurb: 'Models that ship inside apps.', proof: ['fraud', 'cancer', 'ransom'],
    skills: [
      { n: 'Python', l: 72, note: 'Scripts, Flask apps, ML pipelines' },
      { n: 'scikit-learn and pandas', l: 66, note: 'Classification and preprocessing' },
      { n: 'Keras and CNNs', l: 58, note: 'Medical image classification' },
      { n: 'OpenCV', l: 52, note: 'Image preprocessing' },
      { n: 'Flask services', l: 64, note: 'Serving trained models' }
    ]
  }
];

const SOFT_SKILLS = ['Problem solving', 'Analytical thinking', 'Communication', 'Team collaboration', 'Adaptability', 'Quick learning', 'Time management'];

interface Stat { label: string; to: number; decimals: number; suffix: string }
const STATS: Stat[] = [
  { label: 'CGPA at VTU', to: 9.24, decimals: 2, suffix: '' },
  { label: 'Projects built', to: 8, decimals: 0, suffix: '' },
  { label: 'Public repositories', to: 18, decimals: 0, suffix: '' },
  { label: 'Practice problems solved', to: 50, decimals: 0, suffix: '+' }
];

interface Milestone { when: string; title: string; org: string; body: string }
const EXPERIENCE: Milestone[] = [
  {
    when: 'July 2026 to now', title: 'Java Full Stack Development Intern', org: 'Dhee Coding Lab Pvt. Ltd.',
    body: 'Building web applications with Core Java, HTML, CSS, JDBC, Servlets, JSP and MySQL. Implementing CRUD operations with Java and MySQL, and strengthening debugging, database management and problem-solving through practical projects.'
  },
  {
    when: 'Aug 2023 to now', title: 'B.E. in Information Science and Engineering', org: 'Vivekananda Institute of Engineering, Bengaluru',
    body: 'Visvesvaraya Technological University. CGPA 9.24.'
  },
  { when: 'Mar 2022', title: 'Pre-University Course (PCMB), Class XII', org: 'Vidya Nidhi Independent PU College, Tumkur', body: '90.16%' },
  { when: 'Aug 2020', title: 'SSLC, Class X', org: 'Vasavi Vidyanikethan, Magadi Town', body: '96.32%' }
];

const NAV_ITEMS: Array<[string, string]> = [
  ['About', 'about'], ['Skills', 'skills'], ['Projects', 'projects'], ['Experience', 'experience'], ['Contact', 'contact']
];
