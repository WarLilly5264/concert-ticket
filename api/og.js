export default async function handler(req, res) {
  const { event } = req.query;
  const host = req.headers.host;
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // กำหนดข้อมูลพรีวิวของแต่ละงาน
  const metaMap = {
    '1': {
      title: 'INDIE KIDS X BAANNAA',
      description: '27 NOVEMBER 2026 @ BAANNAA | จองบัตรออนไลน์ 150฿',
      image: `${baseUrl}/image_899a45.jpg`,
    },
    '2': {
      title: 'อินดี้คิดส์ปาร์ตี้ 3',
      description: '26 DECEMBER 2026 | จองบัตรออนไลน์ 150฿',
      image: `${baseUrl}/indie-kids-3.png`,
    },
  };

  const meta = metaMap[event] || {
    title: 'CONCERT TICKETS',
    description: 'ระบบจองบัตรคอนเสิร์ตออนไลน์',
    image: `${baseUrl}/poster-1.jpg`,
  };

  // ดึงไฟล์ index.html ที่ Build แล้วมาสวมชื่อและรูปใหม่
  const htmlRes = await fetch(`${baseUrl}/index.html`);
  let html = await htmlRes.text();

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
    .replace('content="CONCERT TICKETS"', `content="${meta.title}"`)
    .replace('content="ระบบจองบัตรคอนเสิร์ตออนไลน์"', `content="${meta.description}"`)
    .replace('content=""', `content="${meta.image}"`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}