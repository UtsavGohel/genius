"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // Import session hook
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession(); // Get authentication status

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in"); // Redirect if not logged in
    }
  }, [status, router]);

  const handleSubmit = () => {
    if (prompt.trim()) {
      router.push(`/editor?query=${encodeURIComponent(prompt)}`);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white">
      {/* Top Heading Section */}
      <motion.h1
        className="text-5xl font-extrabold text-center mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        What do you want to build?
      </motion.h1>
      <motion.p
        className="text-lg text-gray-400 text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Prompt, run, edit, and deploy full-stack{" "}
        <span className="text-blue-400">web</span> and{" "}
        <span className="text-green-400">mobile</span> apps.
      </motion.p>

      {/* Input Box */}
      <motion.div
        className="flex items-center w-full max-w-xl border border-gray-700 rounded-xl bg-gray-900/80 p-3 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <Input
          type="text"
          placeholder="Enter your prompt..."
          className="flex-grow bg-transparent text-white outline-none px-2 text-lg placeholder-gray-500 focus:ring-2 focus:ring-blue-500 rounded-lg"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-500 transition-all duration-200 px-4 py-2 rounded-lg shadow-md"
        >
          <ArrowRight className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Popular Suggestions */}
      <motion.div
        className="mt-6 flex flex-wrap justify-center gap-3 text-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        {[
          "Build a To-Do App with react, it can Add/Edit/Delete",
          "Create a chat app with react and node",
          "Develop a portfolio website",
          "Generate a landing page",
        ].map((suggestion) => (
          <button
            key={suggestion}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-all duration-200"
            onClick={() => setPrompt(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
