export async function callClaudeFlash(requestText: string, contextText: string): Promise<string> {
  const res = await fetch('/api/claude/flash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: requestText, context: contextText })
  });
  if (!res.ok) {
    const msg = await safeReadText(res);
    throw new Error(`Flash call failed: ${res.status} ${res.statusText}${msg ? ` - ${msg}` : ''}`);
  }
  const data = await res.json().catch(async () => ({ output: await res.text() }));
  return (data?.output ?? '').toString();
}

async function safeReadText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}


