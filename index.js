require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.log('❌ BOT_TOKEN missing');
  process.exit(1);
}

const bot = new TelegramBot(token, {
  polling: true,
});

console.log('✅ Bot running');

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

async function getPreview(url) {

  // TikTok Support
  if (url.includes('tiktok.com')) {

    const api =
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

    const { data } = await axios.get(api);

    return {
      platform: 'TikTok',
      title: data.title || 'No title',
      image: data.thumbnail_url,
      description: data.title || 'No description',
    };
  }

  // Normal Website Preview
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const $ = cheerio.load(response.data);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    'No title';

  const description =
    $('meta[property="og:description"]').attr('content') ||
    'No description';

  const image =
    $('meta[property="og:image"]').attr('content');

  return {
    title,
    description,
    image,
  };
}

bot.on('message', async (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  console.log('📩 Message:', text);

  if (!isValidUrl(text)) {

    return bot.sendMessage(
      chatId,
      '⚠️ Please send a valid URL.'
    );
  }

  try {

    const preview = await getPreview(text);

    const message =
`🎬 Title:
${preview.title}

📝 Description:
${preview.description || 'No description'}

🔗 Link:
${text}`;

    if (preview.image) {

      await bot.sendPhoto(
        chatId,
        preview.image,
        {
          caption: message,
        }
      );

    } else {

      await bot.sendMessage(
        chatId,
        message
      );
    }

  } catch (err) {

    console.log('❌ Error:', err.message);

    bot.sendMessage(
      chatId,
      '❌ Failed to fetch preview.'
    );
  }
});