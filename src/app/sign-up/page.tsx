"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    setError(""); // Clear previous errors
    if (!name || !email || !password || !confirmPassword)
      return setError("All fields are required");
    if (password !== confirmPassword) return setError("Passwords do not match");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to sign up");
      }

      router.push("/sign-in"); // Redirect after successful signup
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mt-4 bg-gray-700 rounded-md focus:outline-none"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mt-4 bg-gray-700 rounded-md focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mt-4 bg-gray-700 rounded-md focus:outline-none"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-3 mt-4 bg-gray-700 rounded-md focus:outline-none"
        />

        <Button
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600"
          onClick={handleSignUp}
        >
          Sign Up
        </Button>

        <p className="text-sm text-gray-400 text-center mt-4">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-blue-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
