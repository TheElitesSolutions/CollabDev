import Link from "next/link"
import { ArrowRight, Code2, Users, Zap, Shield } from "lucide-react"
import { appConfig } from "@/config/app"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Code2,
    title: "Real-time Collaboration",
    description: "Code together in real-time with your team. See changes instantly as they happen.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Organize your team with projects, roles, and permissions. Stay in sync.",
  },
  {
    icon: Zap,
    title: "Fast & Responsive",
    description: "Built for performance. Lightning-fast editing and seamless experience.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Enterprise-grade security. Your code is safe with end-to-end encryption.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
              C+
            </div>
            <span>{appConfig.name}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Button asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="container flex max-w-[64rem] flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
            Phase A - MVP Ready
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Collaborative Development
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {appConfig.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">
                Sign In to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20 px-4">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to build together
            </h2>
            <p className="mt-4 text-muted-foreground">
              A complete platform for collaborative software development
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-6 rounded-lg bg-background border"
              >
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 {appConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span
              className="text-sm text-muted-foreground cursor-not-allowed"
              title="Documentation coming soon"
            >
              Documentation
            </span>
            <Link
              href={appConfig.links.github}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
