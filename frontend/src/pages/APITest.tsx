import { useState } from 'react';
import { callClaudeFlash, saveGLBFile } from '../lib/apicalls';

export function APITest() {
  const [request, setRequest] = useState('Describe an L-bracket with adjustable hole pitch.');
  const [context, setContext] = useState('Units: mm. Output concise JSON spec.');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ping, setPing] = useState<string>('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOutput('');
    console.log("submitting req", { request, context });
    try {
      const res = await callClaudeFlash(request, context);
      saveGLBFile(res.glbBuffer, res.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onPing = async () => {
    setPing('');
    setError(null);
    try {
      const res = await fetch('/api/test');
      const json = await res.json();
      setPing(JSON.stringify(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ping failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">API Test: Claude Flash</h1>
        <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Request</label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              className="w-full border rounded p-2 min-h-[90px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full border rounded p-2 min-h-[60px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={onPing}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded border"
            >
              Ping Server
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>
        )}

        {ping && (
          <pre className="bg-white rounded-xl shadow p-4 whitespace-pre-wrap text-sm">{ping}</pre>
        )}

        {output && (
          <pre className="bg-white rounded-xl shadow p-4 whitespace-pre-wrap text-sm">{output}</pre>
        )}
      </div>
    </div>
  );
}


