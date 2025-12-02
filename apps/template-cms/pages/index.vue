<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto px-4 py-16">
      <div class="max-w-4xl mx-auto">
        <!-- Hero Section -->
        <div class="text-center mb-16">
          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              ComfyUI Template Manager
            </h1>
            <p class="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamline your workflow template management with our modern, intuitive interface. 
              Upload, organize, and maintain ComfyUI templates with ease.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" @click="navigateTo('/admin')">
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Template
            </Button>
            <Button variant="outline" size="lg" @click="navigateTo('/admin')">
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Templates
            </Button>
          </div>
        </div>

        <!-- Features Grid -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card>
            <CardHeader>
              <div class="flex items-center space-x-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>Template Upload</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Modern interface for uploading workflow templates with drag-and-drop support and real-time validation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div class="flex items-center space-x-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                  <svg class="w-5 h-5 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <CardTitle>Auto File Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatically handles JSON updates, file naming, and repository structure maintenance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div class="flex items-center space-x-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
                  <svg class="w-5 h-5 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <CardTitle>Git Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamless GitHub integration with automatic commits, pull requests, and branch management.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <!-- Status Cards -->
        <div class="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center">
                <svg class="mr-2 h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ready Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-2 text-sm">
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Modern UI with shadcn/ui design system
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Template upload form with validation
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Real-time progress tracking
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Responsive design and accessibility
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="flex items-center">
                <svg class="mr-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-2 text-sm">
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-muted rounded-full mr-3"></span>
                  GitHub OAuth authentication
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-muted rounded-full mr-3"></span>
                  Automated file processing backend
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-muted rounded-full mr-3"></span>
                  Direct GitHub repository integration
                </li>
                <li class="flex items-center text-muted-foreground">
                  <span class="w-2 h-2 bg-muted rounded-full mr-3"></span>
                  Template preview and validation
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

// Set page title
useHead({
  title: 'ComfyUI Template Manager'
})
</script>