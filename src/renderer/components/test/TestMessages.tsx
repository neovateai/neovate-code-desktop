// @ts-nocheck
import { Message } from './components/messages/Message';
import type { NormalizedMessage } from './client/types/message';

// Helper to generate UUIDs
let uuidCounter = 0;
const generateUuid = () => `test-uuid-${++uuidCounter}`;

// ========================================
// LOOP 1: Simple Ping-Pong
// ========================================
const createPingPongMessages = (): NormalizedMessage[] => {
  const messages: NormalizedMessage[] = [];

  // User: ping
  messages.push({
    type: 'message',
    role: 'user',
    content: 'ping',
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: null,
  });

  // Assistant: ping
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'ping',
      },
    ],
    text: 'ping',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    },
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: null,
  });

  return messages;
};

// ========================================
// LOOP 2: Comprehensive Agent Call Demo
// All types of assistant messages and tool calls
// ========================================
const createComprehensiveMessages = (): NormalizedMessage[] => {
  const messages: NormalizedMessage[] = [];

  // Long user request
  messages.push({
    type: 'message',
    role: 'user',
    content: `I need your help with a comprehensive project setup. Here's what I need:

1. **Create a new React project** with TypeScript support
2. **Set up the folder structure** with proper organization
3. **Install dependencies** including testing libraries
4. **Create configuration files** for ESLint, Prettier, and TypeScript
5. **Write sample components** to demonstrate best practices
6. **Set up a todo tracking system** to manage project tasks
7. **Fetch external documentation** from the React website
8. **Search through existing code** for patterns to follow

Please help me accomplish all of these tasks. I want you to demonstrate your full capabilities with file operations, bash commands, search functionality, and task management.`,
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: null,
  });

  // Assistant message with reasoning/thinking
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'reasoning',
        text: `Let me analyze this comprehensive request step by step:

1. First, I need to understand the project structure the user wants
2. I should list the current directory to see what exists
3. Then search for any existing configuration patterns
4. Set up a todo list to track all the tasks
5. Create files, execute commands, and fetch documentation
6. Finally, demonstrate all tool types available

I'll start with the simpler operations and work up to more complex ones. This will showcase:
- read, write, edit operations
- bash, bash_output, kill_bash for command execution
- glob, grep, ls for file/directory operations
- todoRead, todoWrite for task management
- fetch for external resources
- AskUserQuestion for interactive decisions`,
      },
      {
        type: 'text',
        text: `I'd be happy to help you set up this comprehensive project! Let me walk you through all the steps and demonstrate various capabilities along the way.

## Starting with Project Analysis

First, let me check the current directory structure and set up a task tracking system.`,
      },
    ],
    text: "I'd be happy to help you set up this comprehensive project!",
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 500,
      outputTokens: 350,
      totalTokens: 850,
    },
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: null,
  });

  // 1. ls tool - List directory
  const lsToolId = generateUuid();
  const lsAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: "Let me check what's in the current directory:",
      },
      {
        type: 'tool_use',
        id: lsToolId,
        name: 'ls',
        input: {
          dir_path: '/project',
        },
        description: 'Listing contents of /project',
      },
    ],
    text: "Let me check what's in the current directory:",
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: lsAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: lsToolId,
        name: 'ls',
        input: { dir_path: '/project' },
        result: {
          llmContent: `📂 /project
├── 📁 src/
├── 📁 node_modules/
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 README.md
└── 📄 .gitignore`,
          returnDisplay: `📂 /project
├── 📁 src/
├── 📁 node_modules/
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 README.md
└── 📄 .gitignore`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: lsAssistantUuid,
  });

  // 2. todoWrite tool - Create task list
  const todoWriteToolId = generateUuid();
  const todoWriteAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Now let me set up our task tracking system to manage all the work we need to do:',
      },
      {
        type: 'tool_use',
        id: todoWriteToolId,
        name: 'todoWrite',
        input: {
          todos: [
            {
              id: '1',
              content: 'Set up folder structure',
              status: 'pending',
              priority: 'high',
            },
            {
              id: '2',
              content: 'Install dependencies',
              status: 'pending',
              priority: 'high',
            },
            {
              id: '3',
              content: 'Create configuration files',
              status: 'pending',
              priority: 'medium',
            },
            {
              id: '4',
              content: 'Write sample components',
              status: 'pending',
              priority: 'medium',
            },
            {
              id: '5',
              content: 'Fetch documentation',
              status: 'pending',
              priority: 'low',
            },
            {
              id: '6',
              content: 'Search existing patterns',
              status: 'pending',
              priority: 'low',
            },
          ],
        },
        description: 'Setting up project task tracking',
      },
    ],
    text: 'Now let me set up our task tracking system:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 150,
      outputTokens: 120,
      totalTokens: 270,
    },
    timestamp: new Date().toISOString(),
    uuid: todoWriteAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: todoWriteToolId,
        name: 'todoWrite',
        input: {},
        result: {
          llmContent: 'Todos created successfully',
          returnDisplay: {
            type: 'todo_write',
            todos: [
              { id: '1', text: 'Set up folder structure', completed: false },
              { id: '2', text: 'Install dependencies', completed: false },
              { id: '3', text: 'Create configuration files', completed: false },
              { id: '4', text: 'Write sample components', completed: false },
              { id: '5', text: 'Fetch documentation', completed: false },
              { id: '6', text: 'Search existing patterns', completed: false },
            ],
          },
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: todoWriteAssistantUuid,
  });

  // 3. read tool - Read file
  const readToolId = generateUuid();
  const readAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me read the existing package.json to understand the current project configuration:',
      },
      {
        type: 'tool_use',
        id: readToolId,
        name: 'read',
        input: {
          file_path: '/project/package.json',
          offset: null,
          limit: null,
        },
        description: 'Reading /project/package.json',
      },
    ],
    text: 'Let me read the existing package.json:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: readAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: readToolId,
        name: 'read',
        input: { file_path: '/project/package.json' },
        result: {
          llmContent: `{
  "name": "my-react-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}`,
          returnDisplay: `{
  "name": "my-react-project",
  "version": "1.0.0",
  ...
}`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: readAssistantUuid,
  });

  // 4. glob tool - Find files
  const globToolId = generateUuid();
  const globAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me find all TypeScript files in the project to understand the existing code structure:',
      },
      {
        type: 'tool_use',
        id: globToolId,
        name: 'glob',
        input: {
          pattern: '**/*.tsx',
          path: '/project/src',
        },
        description: 'Searching for **/*.tsx in /project/src',
      },
    ],
    text: 'Let me find all TypeScript files:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: globAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: globToolId,
        name: 'glob',
        input: { pattern: '**/*.tsx', path: '/project/src' },
        result: {
          llmContent: `Found 4 files:
- /project/src/App.tsx
- /project/src/main.tsx
- /project/src/components/Button.tsx
- /project/src/components/Card.tsx`,
          returnDisplay: `Found 4 files:
• App.tsx
• main.tsx
• components/Button.tsx
• components/Card.tsx`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: globAssistantUuid,
  });

  // 5. grep tool - Search patterns
  const grepToolId = generateUuid();
  const grepAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Now let me search for existing patterns in the codebase to maintain consistency:',
      },
      {
        type: 'tool_use',
        id: grepToolId,
        name: 'grep',
        input: {
          pattern: 'useState|useEffect|useMemo',
          search_path: '/project/src',
          include: '*.tsx',
          limit: 20,
        },
        description: 'Searching for React hooks usage',
      },
    ],
    text: 'Now let me search for existing patterns:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: grepAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: grepToolId,
        name: 'grep',
        input: { pattern: 'useState|useEffect', search_path: '/project/src' },
        result: {
          llmContent: `App.tsx:3: import { useState, useEffect } from 'react';
App.tsx:8: const [count, setCount] = useState(0);
App.tsx:12: useEffect(() => {
components/Button.tsx:2: import { useState } from 'react';
components/Button.tsx:5: const [isHovered, setIsHovered] = useState(false);`,
          returnDisplay: `Found 5 matches in 2 files:
• App.tsx (3 matches)
• components/Button.tsx (2 matches)`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: grepAssistantUuid,
  });

  // 6. AskUserQuestion tool - Get user preference
  const askToolId = generateUuid();
  const askAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Before I proceed with the setup, I need to know your preferences for the project configuration:',
      },
      {
        type: 'tool_use',
        id: askToolId,
        name: 'AskUserQuestion',
        input: {
          questions: [
            {
              question: 'Which styling solution do you prefer?',
              header: 'Styling Choice',
              options: [
                {
                  label: 'Tailwind CSS',
                  description: 'Utility-first CSS framework',
                },
                {
                  label: 'CSS Modules',
                  description: 'Scoped CSS with modules',
                },
                {
                  label: 'Styled Components',
                  description: 'CSS-in-JS solution',
                },
                { label: 'Vanilla CSS', description: 'Plain CSS files' },
              ],
              multiSelect: false,
            },
            {
              question: 'Which testing frameworks should I set up?',
              header: 'Testing Setup',
              options: [
                { label: 'Vitest', description: 'Fast unit testing' },
                {
                  label: 'React Testing Library',
                  description: 'Component testing',
                },
                { label: 'Playwright', description: 'E2E testing' },
                { label: 'Cypress', description: 'E2E testing alternative' },
              ],
              multiSelect: true,
            },
          ],
          answers: {},
        },
        description: 'Requesting project preferences',
      },
    ],
    text: 'Before I proceed, I need to know your preferences:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 150,
      outputTokens: 200,
      totalTokens: 350,
    },
    timestamp: new Date().toISOString(),
    uuid: askAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: askToolId,
        name: 'AskUserQuestion',
        input: {},
        result: {
          llmContent: `User selected:
- Styling: Tailwind CSS
- Testing: Vitest, React Testing Library`,
          returnDisplay: `User Preferences:
✓ Styling: Tailwind CSS
✓ Testing: Vitest, React Testing Library`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: askAssistantUuid,
  });

  // 7. bash tool - Run command
  const bashToolId = generateUuid();
  const bashAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: "Great choices! Now let me install the dependencies. I'll run the installation command:",
      },
      {
        type: 'tool_use',
        id: bashToolId,
        name: 'bash',
        input: {
          command:
            'npm install tailwindcss postcss autoprefixer vitest @testing-library/react --save-dev',
          timeout: 120000,
          run_in_background: false,
        },
        description: 'Installing dependencies via npm',
      },
    ],
    text: 'Great choices! Now let me install the dependencies:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 150,
      outputTokens: 100,
      totalTokens: 250,
    },
    timestamp: new Date().toISOString(),
    uuid: bashAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: bashToolId,
        name: 'bash',
        input: {
          command:
            'npm install tailwindcss postcss autoprefixer vitest @testing-library/react --save-dev',
        },
        result: {
          llmContent: `added 127 packages in 8s

43 packages are looking for funding
  run \`npm fund\` for details`,
          returnDisplay: `✓ Installation complete
Added 127 packages in 8s`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: bashAssistantUuid,
  });

  // 8. bash with background - Long running command
  const bashBgToolId = generateUuid();
  const bashBgAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me start the development server in the background so you can see your changes live:',
      },
      {
        type: 'tool_use',
        id: bashBgToolId,
        name: 'bash',
        input: {
          command: 'npm run dev',
          timeout: null,
          run_in_background: true,
        },
        description: 'Starting development server in background',
      },
    ],
    text: 'Let me start the development server:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: bashBgAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: bashBgToolId,
        name: 'bash',
        input: { command: 'npm run dev', run_in_background: true },
        result: {
          llmContent: `Background task started with id: task_abc123
Initial output:
  VITE v4.4.0  ready in 324 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose`,
          returnDisplay: `🚀 Dev server started
Running at http://localhost:5173/
Task ID: task_abc123`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: bashBgAssistantUuid,
  });

  // 9. bash_output tool - Check background task
  const bashOutputToolId = generateUuid();
  const bashOutputAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me check the output of the running development server:',
      },
      {
        type: 'tool_use',
        id: bashOutputToolId,
        name: 'bash_output',
        input: {
          task_id: 'task_abc123',
        },
        description: 'Getting output from background task',
      },
    ],
    text: 'Let me check the development server output:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 80,
      outputTokens: 60,
      totalTokens: 140,
    },
    timestamp: new Date().toISOString(),
    uuid: bashOutputAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: bashOutputToolId,
        name: 'bash_output',
        input: { task_id: 'task_abc123' },
        result: {
          llmContent: `Task task_abc123 is still running.
Recent output:
  VITE v4.4.0  ready in 324 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help`,
          returnDisplay: `⏳ Task running
Latest: Server ready at http://localhost:5173/`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: bashOutputAssistantUuid,
  });

  // 10. write tool - Create new file
  const writeToolId = generateUuid();
  const writeAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Now let me create the Tailwind CSS configuration file:',
      },
      {
        type: 'tool_use',
        id: writeToolId,
        name: 'write',
        input: {
          file_path: '/project/tailwind.config.js',
          content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`,
        },
        description: 'Creating /project/tailwind.config.js',
      },
    ],
    text: 'Now let me create the Tailwind configuration:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 150,
      outputTokens: 200,
      totalTokens: 350,
    },
    timestamp: new Date().toISOString(),
    uuid: writeAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: writeToolId,
        name: 'write',
        input: { file_path: '/project/tailwind.config.js' },
        result: {
          llmContent:
            'File created successfully at /project/tailwind.config.js',
          returnDisplay: '✓ Created tailwind.config.js',
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: writeAssistantUuid,
  });

  // 11. edit tool - Modify existing file
  const editToolId = generateUuid();
  const editAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me update the Button component to use Tailwind CSS classes:',
      },
      {
        type: 'tool_use',
        id: editToolId,
        name: 'edit',
        input: {
          file_path: '/project/src/components/Button.tsx',
          old_string: `const Button = () => {
  return <button>Click</button>;
};`,
          new_string: `interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick,
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={\`px-4 py-2 rounded-lg font-medium transition-colors
        \${variant === 'primary' 
          ? 'bg-primary text-white hover:bg-blue-600' 
          : 'bg-secondary text-white hover:bg-slate-600'
        }\`}
    >
      {children}
    </button>
  );
};`,
          replace_all: false,
        },
        description: 'Updating Button component with Tailwind',
      },
    ],
    text: 'Let me update the Button component:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 200,
      outputTokens: 250,
      totalTokens: 450,
    },
    timestamp: new Date().toISOString(),
    uuid: editAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: editToolId,
        name: 'edit',
        input: {
          file_path: '/project/src/components/Button.tsx',
          old_string:
            'const Button = () => {\n  return <button>Click</button>;\n};',
          new_string: '/* ... new Button component ... */',
        },
        result: {
          llmContent: 'File updated successfully',
          returnDisplay: {
            type: 'diff_viewer',
            diff: `- const Button = () => {
-   return <button>Click</button>;
- };
+ interface ButtonProps {
+   children: React.ReactNode;
+   onClick?: () => void;
+   variant?: 'primary' | 'secondary';
+ }
+ 
+ const Button: React.FC<ButtonProps> = ({ 
+   children, 
+   onClick,
+   variant = 'primary' 
+ }) => {
+   return (
+     <button 
+       onClick={onClick}
+       className={\`px-4 py-2 rounded-lg ...\`}
+     >
+       {children}
+     </button>
+   );
+ };`,
          },
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: editAssistantUuid,
  });

  // 12. fetch tool - Get external documentation
  const fetchToolId = generateUuid();
  const fetchAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me fetch the React documentation for best practices reference:',
      },
      {
        type: 'tool_use',
        id: fetchToolId,
        name: 'fetch',
        input: {
          url: 'https://react.dev/learn/thinking-in-react',
          prompt:
            'Extract the key principles of thinking in React and component design',
        },
        description: 'Fetching React documentation',
      },
    ],
    text: 'Let me fetch the React documentation:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
    },
    timestamp: new Date().toISOString(),
    uuid: fetchAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: fetchToolId,
        name: 'fetch',
        input: { url: 'https://react.dev/learn/thinking-in-react' },
        result: {
          llmContent: `# Thinking in React - Key Principles

## 1. Break the UI into a component hierarchy
- Identify components based on the single responsibility principle
- Each component should ideally do one thing

## 2. Build a static version first
- Build components that reuse other components
- Pass data using props
- Don't use state at all in this step

## 3. Identify the minimal UI state
- Find the minimal representation of state
- DRY: Don't Repeat Yourself

## 4. Identify where state should live
- Find common parent for state
- Lift state up when needed

## 5. Add inverse data flow
- Pass callbacks to children
- Children call callbacks to update parent state`,
          returnDisplay: `📄 Fetched: react.dev/learn/thinking-in-react
5 key principles extracted`,
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: fetchAssistantUuid,
  });

  // 13. todoRead tool - Check task progress
  const todoReadToolId = generateUuid();
  const todoReadAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Let me check our progress on the tasks:',
      },
      {
        type: 'tool_use',
        id: todoReadToolId,
        name: 'todoRead',
        input: {},
        description: 'Checking task progress',
      },
    ],
    text: 'Let me check our task progress:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 80,
      outputTokens: 60,
      totalTokens: 140,
    },
    timestamp: new Date().toISOString(),
    uuid: todoReadAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: todoReadToolId,
        name: 'todoRead',
        input: {},
        result: {
          llmContent: 'Current todos retrieved',
          returnDisplay: {
            type: 'todo_read',
            todos: [
              { id: '1', text: 'Set up folder structure', completed: true },
              { id: '2', text: 'Install dependencies', completed: true },
              { id: '3', text: 'Create configuration files', completed: true },
              { id: '4', text: 'Write sample components', completed: true },
              { id: '5', text: 'Fetch documentation', completed: true },
              { id: '6', text: 'Search existing patterns', completed: true },
            ],
          },
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: todoReadAssistantUuid,
  });

  // 14. kill_bash tool - Stop background task
  const killBashToolId = generateUuid();
  const killBashAssistantUuid = generateUuid();
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: "Now that we're done with setup, let me stop the development server:",
      },
      {
        type: 'tool_use',
        id: killBashToolId,
        name: 'kill_bash',
        input: {
          task_id: 'task_abc123',
        },
        description: 'Stopping background dev server',
      },
    ],
    text: 'Let me stop the development server:',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 80,
      outputTokens: 60,
      totalTokens: 140,
    },
    timestamp: new Date().toISOString(),
    uuid: killBashAssistantUuid,
    parentUuid: null,
  });

  messages.push({
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        id: killBashToolId,
        name: 'kill_bash',
        input: { task_id: 'task_abc123' },
        result: {
          llmContent: 'Task task_abc123 has been terminated',
          returnDisplay: '✓ Dev server stopped',
        },
      },
    ],
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: killBashAssistantUuid,
  });

  // Final summary message
  messages.push({
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: `## 🎉 Project Setup Complete!

I've successfully completed all the tasks for your comprehensive project setup. Here's a summary of what was accomplished:

### ✅ Completed Tasks

| Task | Status |
|------|--------|
| Set up folder structure | ✓ Complete |
| Install dependencies | ✓ Complete |
| Create configuration files | ✓ Complete |
| Write sample components | ✓ Complete |
| Fetch documentation | ✓ Complete |
| Search existing patterns | ✓ Complete |

### 📦 Installed Packages
- **tailwindcss** - Utility-first CSS framework
- **postcss** & **autoprefixer** - CSS processing
- **vitest** - Fast unit testing
- **@testing-library/react** - Component testing

### 📁 Created/Modified Files
- \`tailwind.config.js\` - Tailwind configuration
- \`src/components/Button.tsx\` - Updated with Tailwind classes

### 💡 Key Takeaways from React Docs
1. Break UI into component hierarchy
2. Build static version first
3. Identify minimal UI state
4. Lift state up when needed
5. Add inverse data flow

Your project is now ready for development! Run \`npm run dev\` to start the development server.`,
      },
    ],
    text: 'Project Setup Complete!',
    model: 'claude-3-sonnet',
    usage: {
      inputTokens: 300,
      outputTokens: 400,
      totalTokens: 700,
    },
    timestamp: new Date().toISOString(),
    uuid: generateUuid(),
    parentUuid: null,
  });

  return messages;
};

export function TestMessages() {
  const pingPongMessages = createPingPongMessages();
  const comprehensiveMessages = createComprehensiveMessages();

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          marginBottom: '16px',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
        }}
      >
        Message Component Test Scenarios
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '800px',
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {/* LOOP 1: Simple Ping-Pong */}
        {pingPongMessages.map((msg, idx) => (
          <Message
            key={`ping-${idx}`}
            message={msg}
            allMessages={pingPongMessages}
          />
        ))}

        {/* LOOP 2: Comprehensive Agent Demo */}
        {comprehensiveMessages.map((msg, idx) => (
          <Message
            key={`comp-${idx}`}
            message={msg}
            allMessages={comprehensiveMessages}
          />
        ))}
      </div>
    </div>
  );
}

function LoopHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        backgroundColor: 'var(--bg-tertiary)',
        padding: '10px 14px',
        borderRadius: '6px',
        marginTop: '16px',
        marginBottom: '8px',
        borderLeft: '4px solid var(--accent-primary)',
      }}
    >
      {title}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '6px 12px',
        borderRadius: '4px',
        marginTop: '8px',
      }}
    >
      {title}
    </div>
  );
}

export default TestMessages;
