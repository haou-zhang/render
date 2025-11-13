'use client';

import { FormEvent, useEffect, useState } from 'react';

export default function HaoUTest() {
  const [template, setTemplate] = useState('pay_notice');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'token' | 'data'>('token');
  const [dataInput, setDataInput] = useState('{\n  "items": []\n}');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setError('');
    if (!template) {
      setError('请提供模板名');
      return;
    }

    if (mode === 'token') {
      if (!token) {
        setError('Token 不能为空');
        return;
      }
      const target = `${window.location.origin}/${encodeURIComponent(template)}/${encodeURIComponent(token)}`;
      setUrl(target);
      window.open(target, '_blank', 'noopener');
      return;
    }

    setLoading(true);
    await handleDataMode();
  };

  const handleDataMode = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataInput);
    } catch (error) {
      setError('Data 不是合法的 JSON');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/haoutest/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: template,
          data: parsed,
          token: token || undefined
        })
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.message ?? '渲染失败');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setUrl(blobUrl);
      window.open(blobUrl, '_blank', 'noopener');
    } catch (error) {
      setError(error instanceof Error ? error.message : '渲染失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="card">
        <h1>Haou Test Harness</h1>
        <p>
          快速调试两种模式：
          <br />1. Token 模式（真实走 builder 接口）
          <br />2. 直接粘贴 Data JSON 生成 PDF（仅用于调试）
        </p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div className="mode-toggle">
            <label>
              <input
                type="radio"
                name="mode"
                value="token"
                checked={mode === 'token'}
                onChange={() => setMode('token')}
              />
              Token 模式
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                value="data"
                checked={mode === 'data'}
                onChange={() => setMode('data')}
              />
              Data JSON 模式
            </label>
          </div>
          <label>
            模板名
            <input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="pay_notice"
              required
            />
          </label>
          <label>
            Token {mode === 'data' && <small>（可选，默认 haoutest-data）</small>}
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={mode === 'token' ? 'builder-token' : 'haoutest-data'}
              required={mode === 'token'}
            />
          </label>
          {mode === 'data' && (
            <label>
              Data JSON
              <textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                rows={10}
                placeholder='{"items": []}'
                required
              />
            </label>
          )}
          <button type="submit">生成 PDF</button>
        </form>
        {loading && <p>正在渲染...</p>}
        {error && <p style={{ color: '#ffb4b4' }}>{error}</p>}
        {url && (
          <p>
            最近一次请求：<a href={url}>{url}</a>
          </p>
        )}
      </section>
      <style jsx>{`
        label {
          display: grid;
          gap: 0.4rem;
          font-size: 0.95rem;
        }
        input {
          padding: 0.7rem 0.9rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.2);
          color: white;
        }
        button {
          border: none;
          border-radius: 999px;
          padding: 0.8rem 1.7rem;
          font-weight: 600;
          font-size: 1rem;
          background: linear-gradient(120deg, #65f0ff, #94f5c0);
          color: #020203;
          cursor: pointer;
        }
        textarea {
          padding: 0.7rem 0.9rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.2);
          color: white;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .mode-toggle {
          display: flex;
          gap: 1rem;
        }
        .mode-toggle label {
          display: flex;
          gap: 0.35rem;
          align-items: center;
        }
      `}</style>
    </main>
  );
}
