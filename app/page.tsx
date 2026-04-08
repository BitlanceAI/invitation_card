'use client';
import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-[95rem]">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
            Bulk Invitation Generator
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Upload your template and a list of names to instantly generate personalized invitation cards for your event.
          </p>
        </div>

        <UploadForm />
      </div>
    </main>
  );
}
