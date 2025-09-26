// components/Layout.js
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-sky-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="text-center text-sm text-slate-600 py-6">
        © {new Date().getFullYear()} Home Teachers Ghana
      </footer>
    </div>
  );
}
