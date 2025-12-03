export const appConfig = {
  name: "CollabDev+",
  description: "Web-based collaborative development platform combining real-time IDE, visual website builder, chat, video calls, and task management in a single workspace.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  links: {
    github: "https://github.com/yourusername/collabdev-plus",
    docs: "/docs",
  },
} as const

export type AppConfig = typeof appConfig
