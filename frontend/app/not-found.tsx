export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 grid-background">
      <div className="w-full max-w-sm rounded-2xl bg-slate-white p-8">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-6xl font-bold text-brand-velvet">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Page non trouvée</h2>
          <p className="text-gray-600">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
      </div>
    </div>
  );
}
