export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-2">🏫 FirstEduKit Series</h1>
      <p className="text-gray-400 mb-8">HIFS 선생님용 도구 모음</p>
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <a href="/seating" className="bg-blue-700 hover:bg-blue-600 rounded-xl p-6 block">
          <div className="text-2xl mb-2">🪑</div>
          <div className="font-semibold">Seating Chart</div>
          <div className="text-sm text-blue-200">자리 배치 & 드래그</div>
        </a>
        <a href="/wlpe" className="bg-green-700 hover:bg-green-600 rounded-xl p-6 block">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Weekly Lesson Plan Export</div>
          <div className="text-sm text-green-200">주간 수업계획 내보내기</div>
        </a>
      </div>
    </main>
  )
}