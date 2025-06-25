import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Next.js Production Environment
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Production-ready Next.js application for porting components and features from bolt.diy prototypes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>🚀 Rapid Prototyping</CardTitle>
            <CardDescription>
              Use bolt.diy for quick AI-powered prototyping and feature generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate components, features, and logic quickly with AI assistance in bolt.diy
            </p>
            <Button asChild>
              <Link href="/prototype">Start Prototyping</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔄 Code Porting</CardTitle>
            <CardDescription>
              Automated tools to port code from bolt.diy to Next.js
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Convert Remix patterns to Next.js App Router with automated scripts
            </p>
            <Button asChild>
              <Link href="/port">Port Code</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>✅ Production Ready</CardTitle>
            <CardDescription>
              Next.js 14+ with App Router, TypeScript, and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Optimized for performance, SEO, and deployment with proper Next.js conventions
            </p>
            <Button asChild>
              <Link href="/production">View Features</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Hybrid Development Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-medium">1. Prototype in Bolt.diy</div>
            <div className="text-muted-foreground">
              Generate features with AI assistance
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">2. Port to Next.js</div>
            <div className="text-muted-foreground">
              Convert and optimize for production
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">3. Deploy & Scale</div>
            <div className="text-muted-foreground">
              Production-ready with Next.js optimizations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}