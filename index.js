import Banner from '../components/Banner'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Welcome to Home Teachers Ghana
        </h1>
        <p className="text-lg text-gray-700">
          Connecting students with qualified teachers across Ghana. 
          Search by subject, level, and location to find the perfect teacher for your needs.
        </p>
      </div>
    </div>
  )
}