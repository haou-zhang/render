import Link from 'next/link';

const steps = [
  'GET https://render.messesum.com/<template>/<token> 触发渲染并返回图片化 PDF',
  'Token 会通过 POST 转发给 app.messesum.com/builder/render/ 换取数据',
  '模板 HTML 来自 /template 目录，可以自定义 Mustache 占位符',
  '所有 PDF 均嵌入请求来源、Token 的隐式水印，并采用图片底板防篡改'
];

export default function Home() {
  return (
    <main>
      <section className="card">
        <h1>render.messesum.com</h1>
        <p>面向 Messesum Builder 的安全托管渲染服务。使用 Next.js App Router，支持 SSR/ISR，并在 Node Runtime 中完成 HTML→Image→PDF 的链路。</p>
        <h2>开始使用</h2>
        <ul>
          {steps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          临时调试入口：<Link href="/haoutest">/haoutest</Link>
        </p>
      </section>
    </main>
  );
}
