// generate-sitemap.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Sitenizin alan adını ayarlayın
const hostname = 'https://yourdomain.com';

// Sitemap'e eklemek istediğiniz rotalar
const links = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/login', changefreq: 'monthly', priority: 0.7 },
  { url: '/register', changefreq: 'monthly', priority: 0.7 },
  { url: '/profile', changefreq: 'monthly', priority: 0.7 },
  // Diğer sabit sayfalarınızı ekleyin...
];

// Hedef dizin
const publicDir = path.join(__dirname, 'public');
// Eğer public klasörü yoksa oluştur
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Bir SitemapStream oluşturun
const stream = new SitemapStream({ hostname });

// links dizisini Readable stream'e dönüştürüp sitemap akışına gönderin
streamToPromise(Readable.from(links).pipe(stream))
  .then((data) => {
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, data.toString());
    console.log('sitemap.xml oluşturuldu:', sitemapPath);
  })
  .catch(err => {
    console.error('Sitemap oluşturulurken hata:', err);
  });
