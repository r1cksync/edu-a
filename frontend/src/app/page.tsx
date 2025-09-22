'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useHydration } from '@/hooks/use-hydration'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { 
  ArrowRight, 
  BookOpen, 
  Users, 
  Calendar, 
  Award, 
  BarChart3, 
  Video, 
  MessageSquare, 
  FileText, 
  Clock, 
  Target,
  Sparkles,
  CheckCircle,
  Star,
  TrendingUp,
  Globe,
  Zap,
  Shield,
  Brain
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const hasHydrated = useHydration()
  const [mounted, setMounted] = useState(false)
  
  // Enhanced parallax transforms with spring physics and complex animations
  const { scrollYProgress } = useScroll()
  
  // Spring-based smooth transforms
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const heroY = useSpring(useTransform(scrollYProgress, [0, 0.5], [0, -200]), springConfig)
  const heroOpacity = useSpring(useTransform(scrollYProgress, [0, 0.3], [1, 0]), springConfig)
  const heroScale = useSpring(useTransform(scrollYProgress, [0, 0.3], [1, 0.95]), springConfig)
  const heroRotate = useTransform(scrollYProgress, [0, 1], [0, 5])
  
  // Multi-layer background parallax
  const bgY1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -100]), springConfig)
  const bgY2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -200]), springConfig)
  const bgY3 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -300]), springConfig)
  
  // Floating elements with different speeds
  const floatingY1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -150]), springConfig)
  const floatingY2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -100]), springConfig)
  const floatingY3 = useSpring(useTransform(scrollYProgress, [0, 1], [0, -250]), springConfig)
  
  // Advanced feature section animations
  const featuresY = useSpring(useTransform(scrollYProgress, [0.2, 0.8], [100, -100]), springConfig)
  const featuresOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0])
  const featuresScale = useSpring(useTransform(scrollYProgress, [0.1, 0.3], [0.8, 1]), springConfig)
  
  // Navigation shadow effect
  const navShadow = useTransform(scrollYProgress, [0, 0.1], [
    "0 0 0 rgba(0,0,0,0)",
    "0 10px 30px rgba(0,0,0,0.1)"
  ])

  useEffect(() => {
    setMounted(true)
    if (hasHydrated && isAuthenticated && user) {
      router.push('/dashboard')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  if (!hasHydrated || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-300 border-t-transparent opacity-20"></div>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return null // Redirecting
  }

  const features = [
    {
      icon: BookOpen,
      title: "Smart Classrooms",
      description: "Create virtual classrooms with AI-powered tools for enhanced learning experiences and seamless content management.",
      color: "from-blue-500 to-cyan-500",
      highlight: "AI-Enhanced Learning"
    },
    {
      icon: Users,
      title: "Collaborative Learning",
      description: "Foster teamwork with real-time collaboration tools, discussion boards, and interactive peer learning features.",
      color: "from-purple-500 to-pink-500",
      highlight: "Real-time Collaboration"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Integrated calendar system with automated reminders, deadline tracking, and intelligent scheduling assistance.",
      color: "from-green-500 to-emerald-500",
      highlight: "Never Miss Deadlines"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive insights into student performance, learning patterns, and detailed progress tracking.",
      color: "from-orange-500 to-red-500",
      highlight: "Data-Driven Insights"
    },
    {
      icon: Video,
      title: "Video Classes",
      description: "High-quality video conferencing with interactive whiteboards, screen sharing, and recording capabilities.",
      color: "from-indigo-500 to-purple-500",
      highlight: "Interactive Sessions"
    },
    {
      icon: Award,
      title: "AI-Powered Refresher",
      description: "Personalized learning system that identifies weak areas and provides targeted practice for better understanding.",
      color: "from-teal-500 to-cyan-500",
      highlight: "Personalized Learning"
    }
  ]

  // Core platform capabilities for educators and students
  const capabilities = [
    {
      icon: Target,
      title: "Smart Learning",
      description: "AI-powered personalized learning paths that adapt to each student's needs.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: MessageSquare,
      title: "Real-time Collaboration",
      description: "Interactive discussions and instant feedback between teachers and students.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Performance Analytics",
      description: "Track progress with detailed insights and comprehensive learning analytics.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Instant Access",
      description: "Access your classrooms, assignments, and resources from anywhere, anytime.",
      color: "from-orange-500 to-red-500"
    }
  ]

  return (
    <>
      {/* Enhanced multi-layer background with advanced parallax */}
      <motion.div 
        style={{ y: bgY1 }}
        className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 -z-10"
      />
      <motion.div 
        style={{ y: bgY2 }}
        className="fixed inset-0 bg-gradient-to-tr from-purple-50/50 via-pink-50/50 to-blue-50/50 -z-10"
      />
      
      {/* Multi-layer animated background elements with advanced parallax */}
      <div className="fixed inset-0 overflow-hidden -z-5">
        <motion.div 
          style={{ y: floatingY1 }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: floatingY2 }}
          animate={{
            x: [0, -80, 0],
            y: [0, 40, 0],
            scale: [1, 0.8, 1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: floatingY3 }}
          animate={{
            x: [0, 50, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-green-400/10 rounded-full blur-3xl"
        />
        
        {/* Additional floating elements */}
        <motion.div 
          style={{ y: bgY3 }}
          animate={{
            x: [0, -30, 0],
            y: [0, 15, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/4 right-1/3 w-48 h-48 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-2xl"
        />
        <motion.div 
          animate={{
            x: [0, 20, 0],
            y: [0, -25, 0],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
          className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-gradient-to-br from-teal-400/10 to-blue-400/10 rounded-full blur-3xl"
        />
      </div>

      <div className="min-h-screen overflow-x-hidden relative z-10">

      {/* Floating scroll progress indicator */}
      <motion.div
        className="fixed top-1/2 right-6 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-white/30"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <motion.div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="rgba(229, 231, 235, 0.3)"
              strokeWidth="2"
            />
            <motion.circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                pathLength: scrollYProgress
              }}
              strokeDasharray="0 1"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Enhanced Navigation with scroll-triggered effects */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="relative z-50 backdrop-blur-xl bg-white/80 border-b border-white/30 sticky top-0 shadow-lg"
        style={{
          boxShadow: navShadow
        }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg"
                animate={{ 
                  boxShadow: [
                    "0 4px 20px rgba(59, 130, 246, 0.3)",
                    "0 4px 20px rgba(147, 51, 234, 0.3)",
                    "0 4px 20px rgba(59, 130, 246, 0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                whileHover={{ 
                  rotate: 360,
                  transition: { duration: 0.6 }
                }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <motion.span 
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: '200%' }}
              >
                Shayak
              </motion.span>
            </motion.div>
            
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="ghost" className="hover:bg-white/60 backdrop-blur-sm transition-all duration-300">
                    Sign In
                  </Button>
                </motion.div>
              </Link>
              <Link href="/auth/register">
                <motion.div
                  whileHover={{ 
                    scale: 1.05, 
                    y: -2,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                    Get Started
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Enhanced Hero Section with advanced scroll animations */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale, rotateX: heroRotate }}
        className="relative pt-20 pb-32 px-6"
      >
        <div className="container mx-auto max-w-7xl">
          <div className="text-center relative">
            {/* Floating decorative elements */}
            <motion.div
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-10 -left-10 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"
            />
            <motion.div
              animate={{
                y: [0, 15, 0],
                x: [0, -8, 0],
                rotate: [0, -3, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute -top-5 -right-5 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-lg"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-block"
              >
                <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 text-sm px-4 py-2 shadow-lg">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </motion.div>
                  Revolutionizing Education with AI
                </Badge>
              </motion.div>
              
              <motion.h1 
                className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <motion.span 
                  className="block bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Welcome to
                </motion.span>
                <motion.span 
                  className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent relative"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  style={{
                    backgroundSize: '200% 200%',
                  }}
                >
                  <motion.div
                    animate={{ 
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                    style={{ backgroundSize: '200% 200%' }}
                  />
                  Shayak
                  
                  {/* Floating sparkles around the title */}
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-6 -right-6 text-yellow-400"
                  >
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1
                    }}
                    className="absolute -bottom-4 -left-8 text-blue-400"
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                </motion.span>
              </motion.h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                A revolutionary educational platform that transforms how teachers and students connect. 
                Experience the future of learning with AI-powered tools, seamless collaboration, and intelligent insights.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Link href="/auth/register">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button size="lg" className="text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300">
                      Start Your Journey
                      <ArrowRight className="ml-3 w-6 h-6" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="#features">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-2 hover:bg-white/50 backdrop-blur-sm transition-all duration-300">
                      Explore Features
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Enhanced Floating Features with advanced 3D animations */}
            <motion.div 
              initial={{ opacity: 0, y: 80, rotateX: -30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ 
                duration: 1.2, 
                delay: 0.8,
                type: "spring",
                stiffness: 80
              }}
              className="mt-20 relative perspective-1000"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {capabilities.map((capability, index) => (
                  <motion.div
                    key={index}
                    initial={{ 
                      opacity: 0, 
                      y: 40, 
                      scale: 0.8,
                      rotateY: -20 
                    }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      rotateY: 0 
                    }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.9 + index * 0.2,
                      type: "spring",
                      stiffness: 120,
                      damping: 12
                    }}
                    whileHover={{ 
                      scale: 1.12, 
                      y: -12,
                      rotateY: 8,
                      z: 50,
                      transition: { 
                        duration: 0.3,
                        type: "spring",
                        stiffness: 400
                      }
                    }}
                    className="group relative transform-gpu"
                  >
                    <motion.div 
                      className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/40 hover:shadow-3xl transition-all duration-700 overflow-hidden relative"
                      whileHover={{ 
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
                      }}
                    >
                      {/* Animated gradient background with morphing effect */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0, rotate: 0 }}
                        whileHover={{ 
                          opacity: 0.15, 
                          scale: 1.2, 
                          rotate: 180 
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`absolute inset-0 bg-gradient-to-br ${capability.color} rounded-2xl`}
                      />
                      
                      {/* Floating particles with physics */}
                      {[...Array(3)].map((_, particleIndex) => (
                        <motion.div
                          key={particleIndex}
                          animate={{
                            y: [0, -20, 0],
                            x: [0, 10, 0],
                            opacity: [0.2, 0.8, 0.2],
                            scale: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 4 + particleIndex,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: index * 0.5 + particleIndex * 0.7
                          }}
                          className={`absolute w-1 h-1 rounded-full blur-sm ${
                            particleIndex === 0 ? 'bg-blue-400 top-2 right-4' :
                            particleIndex === 1 ? 'bg-purple-400 top-6 right-2' :
                            'bg-pink-400 top-4 right-6'
                          }`}
                        />
                      ))}
                      
                      <motion.div 
                        className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${capability.color} p-3 shadow-lg relative z-10`}
                        whileHover={{ 
                          scale: 1.15,
                          rotate: [0, -5, 5, 0],
                          transition: { duration: 0.5 }
                        }}
                        animate={{
                          boxShadow: [
                            "0 4px 20px rgba(0,0,0,0.1)",
                            "0 8px 30px rgba(0,0,0,0.15)",
                            "0 4px 20px rgba(0,0,0,0.1)"
                          ]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.8 }}
                        >
                          <capability.icon className="h-8 w-8 text-white" />
                        </motion.div>
                      </motion.div>
                      
                      <motion.h3 
                        className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors relative z-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                      >
                        {capability.title}
                      </motion.h3>
                      
                      <motion.p 
                        className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors relative z-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                      >
                        {capability.description}
                      </motion.p>
                      
                      {/* Subtle glow effect on hover */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 0.3 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-xl"
                      />
                    </motion.div>
                    
                    {/* External floating glow */}
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.2, 0.1],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.5
                      }}
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${capability.color} blur-2xl -z-10`}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Enhanced Features Section with advanced scroll animations */}
      <motion.section 
        id="features" 
        style={{ y: featuresY, opacity: featuresOpacity, scale: featuresScale }}
        className="py-24 px-6 relative"
      >
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20 relative"
          >
            {/* Floating badge with advanced animations */}
            <motion.div
              whileInView={{ scale: [0.8, 1.1, 1], rotate: [0, 5, 0] }}
              transition={{ duration: 0.8, type: "spring" }}
              viewport={{ once: true }}
              className="inline-block"
            >
              <Badge className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 shadow-lg">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                </motion.div>
                Powerful Features
              </Badge>
            </motion.div>
            
            <motion.h2 
              className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Everything You Need for
              <br />
              <motion.span 
                className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent relative"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                viewport={{ once: true }}
              >
                Modern Education
                
                {/* Decorative elements */}
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -top-4 -right-8 w-8 h-8 border-2 border-purple-300 rounded-full opacity-30"
                />
              </motion.span>
            </motion.h2>
            
            <motion.p 
              className="text-xl text-gray-600 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              Our comprehensive platform combines cutting-edge technology with intuitive design 
              to create the ultimate learning experience.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -10,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                viewport={{ once: true, margin: "-50px" }}
                className="group relative"
              >
                <Card className="h-full bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                  {/* Animated background gradient */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-lg`}
                  />
                  
                  {/* Floating particles effect */}
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 3 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.2
                    }}
                    className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full blur-sm"
                  />
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.2, 0.6, 0.2],
                    }}
                    transition={{
                      duration: 4 + index * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (index * 0.3) + 1
                    }}
                    className="absolute top-8 right-8 w-1 h-1 bg-purple-400 rounded-full blur-sm"
                  />
                  
                  <CardContent className="p-8 relative z-10">
                    <motion.div 
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                      whileHover={{ 
                        rotate: [0, -10, 10, 0],
                        scale: 1.15 
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <motion.h3 
                      className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-gray-800 transition-colors"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      {feature.title}
                    </motion.h3>
                    
                    <motion.p 
                      className="text-gray-600 mb-6 leading-relaxed group-hover:text-gray-700 transition-colors"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      {feature.description}
                    </motion.p>
                    
                    <motion.div 
                      className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-full inline-block group-hover:bg-blue-100 transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {feature.highlight}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Enhanced Platform Benefits Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"
          />
        </div>
        
        <div className="container mx-auto max-w-7xl relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 bg-gradient-to-r from-green-100 to-blue-100 text-green-700 border-green-200">
              <CheckCircle className="w-4 h-4 mr-2" />
              Platform Benefits
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Why Choose Shayak?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of education with our comprehensive platform designed for modern learning environments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Benefits List */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {[
                {
                  title: "Seamless Integration",
                  description: "Connect all your educational tools in one unified platform with intuitive navigation.",
                  icon: Zap
                },
                {
                  title: "AI-Powered Insights",
                  description: "Get intelligent recommendations and analytics to enhance learning outcomes.",
                  icon: Brain
                },
                {
                  title: "Mobile-First Design",
                  description: "Access your classrooms and materials on any device, anywhere, anytime.",
                  icon: Target
                },
                {
                  title: "Collaborative Environment",
                  description: "Foster meaningful connections between educators and students through interactive tools.",
                  icon: Users
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 10 }}
                  className="flex items-start space-x-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Visual Element */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 shadow-2xl">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-3xl"></div>
                <div className="relative z-10 text-white text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 mx-auto mb-8 bg-white/20 rounded-full flex items-center justify-center"
                  >
                    <Sparkles className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-3xl font-bold mb-4">Start Your Journey</h3>
                  <p className="text-blue-100 mb-8 text-lg">
                    Join the revolution in education technology and transform how you teach and learn.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/auth/register">
                      <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-50 shadow-lg">
                        Get Started Free
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section with morphing backgrounds */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Advanced morphing background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 150, 0],
              y: [0, -80, 0],
              scale: [1, 1.5, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -120, 0],
              y: [0, 100, 0],
              scale: [1, 0.7, 1],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 5
            }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl"
          />
          
          {/* Floating geometric shapes */}
          <motion.div
            animate={{
              y: [0, -30, 0],
              rotate: [0, 360],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/3 right-1/3 w-16 h-16 border border-white/30 rounded-lg backdrop-blur-sm"
          />
          <motion.div
            animate={{
              y: [0, 25, 0],
              x: [0, 15, 0],
              rotate: [0, -180],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3
            }}
            className="absolute bottom-1/3 left-1/3 w-12 h-12 bg-white/20 rounded-full backdrop-blur-sm"
          />
        </div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            viewport={{ once: true }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-24 h-24 mx-auto mb-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-2xl border border-white/30"
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <motion.span
                animate={{
                  backgroundPosition: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
                style={{ backgroundSize: '200%' }}
              >
                Ready to Transform
              </motion.span>
              <br />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Your Teaching Experience?
              </motion.span>
            </motion.h2>
            
            <motion.p 
              className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              Experience the future of education with Shayak. Create engaging classrooms, 
              collaborate with students, and leverage the power of AI to enhance learning outcomes.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center mb-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              viewport={{ once: true }}
            >
              <Link href="/auth/register">
                <motion.div 
                  whileHover={{ 
                    scale: 1.08, 
                    y: -4,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-white/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"
                  />
                  <Button size="lg" className="text-lg px-10 py-4 bg-white text-blue-600 hover:bg-gray-50 shadow-2xl relative z-10 rounded-xl border-2 border-white/20">
                    <motion.span
                      animate={{
                        backgroundPosition: ['0%', '100%', '0%']
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent font-bold"
                      style={{ backgroundSize: '200%' }}
                    >
                      Get Started Today
                    </motion.span>
                    <motion.div
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowRight className="ml-3 w-6 h-6 text-blue-600" />
                    </motion.div>
                  </Button>
                </motion.div>
              </Link>
              
              <Link href="/auth/login">
                <motion.div 
                  whileHover={{ 
                    scale: 1.05, 
                    y: -3,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-xl">
                    Sign In
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-8 text-blue-100 text-sm"
            >
              {[
                { icon: CheckCircle, text: "Quick Setup" },
                { icon: CheckCircle, text: "Intuitive Interface" },
                { icon: CheckCircle, text: "24/7 Platform Access" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: index }}
                  >
                    <item.icon className="w-4 h-4" />
                  </motion.div>
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer with dynamic effects */}
      <footer className="py-12 px-6 bg-gray-900 text-white relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle at 30px 30px, rgba(255,255,255,0.1) 2px, transparent 2px)',
              backgroundSize: '60px 60px'
            }}
          />
        </div>
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="flex items-center justify-center space-x-2 mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(59, 130, 246, 0.3)",
                    "0 0 20px rgba(147, 51, 234, 0.3)",
                    "0 0 20px rgba(59, 130, 246, 0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                whileHover={{ rotate: 360 }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <motion.span 
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: '200%' }}
              >
                Shayak
              </motion.span>
            </motion.div>
            
            <motion.p 
              className="text-gray-400 mb-6 text-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Empowering education through innovative technology.
            </motion.p>
            
            <motion.div 
              className="text-sm text-gray-500"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              © 2024 Shayak. All rights reserved. Built with{' '}
              <motion.span
                animate={{ 
                  scale: [1, 1.2, 1],
                  color: ['#ef4444', '#f59e0b', '#ef4444']
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="inline-block"
              >
                ❤️
              </motion.span>
              {' '}for educators worldwide.
            </motion.div>
          </motion.div>
        </div>
      </footer>

      {/* Floating Action Button for quick access */}
      <motion.div
        className="fixed bottom-8 left-8 z-50"
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 3, duration: 0.8, type: "spring", stiffness: 200 }}
      >
        <motion.button
          whileHover={{ 
            scale: 1.1, 
            rotate: 360,
            boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)"
          }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20 backdrop-blur-sm group"
        >
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ArrowRight className="w-6 h-6 text-white transform -rotate-90 group-hover:scale-110 transition-transform" />
          </motion.div>
          
          {/* Pulsing ring effect */}
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeOut" 
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-purple-600"
          />
        </motion.button>
      </motion.div>
      </div>
    </>
  )
}