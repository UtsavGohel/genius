"use client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FaBolt } from "react-icons/fa";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Hero Section */}
      <section className="w-full h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="flex items-center space-x-2 text-4xl font-bold">
          <FaBolt className="text-yellow-400" />
          <h1>Genius Code Generator</h1>
        </div>
        <p className="mt-4 text-lg text-gray-400 max-w-xl">
          Instantly generate full project source code from your prompts.
        </p>
        <div className="mt-6 flex space-x-4">
          <Link href="/dashboard">
            <Button className="bg-blue-500 hover:bg-blue-600">
              Start Generating
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="border-gray-500 text-gray-900">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-24 bg-gradient-to-b from-gray-900 to-gray-800"></div>

      {/* Features Section */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl"
        >
          <h1 className="text-5xl font-bold">
            Generate Code Instantly with{" "}
            <span className="text-blue-400">Genius</span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg">
            Describe your idea in a prompt, and let Genius generate complete
            source code with real-time updates.
          </p>
          <Button className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600">
            Get Started
          </Button>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="bg-gray-800 p-6 rounded-2xl shadow-md flex flex-col items-center text-center border border-gray-700"
            >
              <feature.icon className="text-blue-400 text-5xl mb-4" />
              <h3 className="text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400 mt-2">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Instant Code Generation",
    description: "Generate complete projects instantly with a single prompt.",
    icon: FaBolt,
  },
  {
    title: "Real-time Updates",
    description: "See code updates live as you type your prompt.",
    icon: IoMdCheckmarkCircleOutline,
  },
  {
    title: "Optimized for All Frameworks",
    description: "Supports React, Next.js, NestJS, and more.",
    icon: IoMdCheckmarkCircleOutline,
  },
];
