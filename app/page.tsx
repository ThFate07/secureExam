"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "./hooks/useAuth";
import { Button } from "./components/ui/button";
import { Shield, Eye, CheckCircle, Users, Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="container mx-auto px-4 py-16">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="flex justify-center items-center mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <Shield className="h-16 w-16 text-gray-900 mr-4" />
            </div>
            <h1 className="text-6xl font-bold text-gray-900">
              SecureExam
            </h1>
          </motion.div>
          
          <motion.p 
            className="text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Advanced online proctoring system ensuring 
            <span className="text-gray-900 font-semibold"> exam integrity </span>
            with cutting-edge technology
          </motion.p>

          {/* Feature highlights */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <Eye className="h-12 w-12 text-gray-900 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Monitoring</h3>
              <p className="text-gray-600">Real-time behavior analysis and detection</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <Shield className="h-12 w-12 text-gray-900 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Platform</h3>
              <p className="text-gray-600">End-to-end encryption and protection</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <Zap className="h-12 w-12 text-gray-900 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Results</h3>
              <p className="text-gray-600">Automated grading and analytics</p>
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="bg-white p-10 rounded-2xl shadow-lg max-w-md mx-auto border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Get Started</h2>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                className="w-full py-4 text-lg font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg transition-all duration-300" 
                onClick={() => router.push("/auth")}
              >
                <Users className="mr-3 h-5 w-5" />
                Login / Register
              </Button>
            </motion.div>
            
            <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-gray-900 mr-1" />
                <span>Secure</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-gray-900 mr-1" />
                <span>Fast</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-gray-900 mr-1" />
                <span>Reliable</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
