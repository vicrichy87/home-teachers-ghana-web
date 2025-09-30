// pages/403.js
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50 text-center px-4">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <p className="mt-4 text-lg text-gray-700">Unauthorized Access</p>
      <p className="text-gray-500 mt-2">
        You don’t have permission to view this page.
      </p>
      <Link href="/">
        <a className="mt-6 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow">
          Go Back Home
        </a>
      </Link>
    </div>
  );
}
