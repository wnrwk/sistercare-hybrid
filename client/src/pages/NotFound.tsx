import { Heart } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <Heart className="w-16 h-16 text-pink-300 mx-auto" />
        <div>
          <h1 className="text-6xl font-bold text-pink-300 mb-2">404</h1>
          <p className="text-gray-500 text-lg">페이지를 찾을 수 없어요</p>
          <p className="text-gray-400 text-sm mt-2">누나가 찾아봤는데 없는 페이지야 😅</p>
        </div>
        <Link href="/">
          <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8 py-3 font-semibold transition-colors">
            누나한테 돌아가기
          </button>
        </Link>
      </div>
    </div>
  );
}
