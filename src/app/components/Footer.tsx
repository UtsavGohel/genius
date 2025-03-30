export default function Footer() {
  return (
    <footer className="py-6 bg-gray-800 text-gray-400 text-sm text-center border-t border-gray-700">
      &copy; {new Date().getFullYear()} Genius. All rights reserved.
    </footer>
  );
}
