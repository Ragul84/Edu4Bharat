
module.exports = async (req, res) => {
  console.log('V2 Webhook Hit');
  const update = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (update && update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (text === '/v' || text === '/version') {
      if (!token) return res.status(200).json({ ok: true });
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🚀 V2 ENDPOINT ACTIVE! Version: 2.5.5\nStatus: Simple Handler'
        })
      });
      return res.status(200).json({ ok: true });
    }
  }
  
  res.status(200).json({ status: 'V2 Active' });
};
