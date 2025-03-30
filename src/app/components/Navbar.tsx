"use client";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 shadow-lg py-4 px-6 flex justify-between items-center z-50 border-b border-gray-700">
      {/* Logo Section */}
      <Link href="/">
        <span className="text-2xl font-bold text-white cursor-pointer tracking-wide">
          Genius 🚀
        </span>
      </Link>

      {/* Authentication Section */}
      <div className="flex items-center space-x-4">
        {session ? (
          <>
            <span className="text-white font-medium">
              Hello, {session.user?.name}
            </span>
            <Button
              onClick={() => signOut()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Link href="/sign-in">
              <Button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                Sign In
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
