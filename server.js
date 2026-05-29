import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.use(express.static('.'));

// ========== MAINTENANCE MODE ==========
let maintenanceMode = false;

// ========== MAINTENANCE MIDDLEWARE ==========
app.use((req, res, next) => {
  if (req.path === '/maintenance.html') {
    return next();
  }
  
  if (maintenanceMode && !req.path.startsWith('/api/')) {
    console.log(`🔧 Maintenance: ${req.path} -> maintenance.html`);
    return res.sendFile(path.join(__dirname, 'maintenance.html'));
  }
  
  next();
});

// ========== KONFIGURASI ==========
const PORT = process.env.PORT || 2004;
const apikey = 'ptla_kXmdCW7XWOjAM8XunzedtcQxshfMqRx4n4PkvLbmams';
const capikey = 'ptlc_NwUWYIpm9LmsVEl0csCDZTQnfHrKrM8cnd6YMBZaBlT';
const domain = 'https://free-by-alzyy-and-salss.panelcloud.biz.id';
const nestid = '5';
const egg = '15';
const loc = '1';
const gmailadmin = 'admin@gmail.com';
const telegramBotToken = '8536927439:AAFRU3pcOvPo_j0EhmrPYGIfCCiMDbn9MBA';
const adminTelegramId = '7532277369';

// ========== ANTI-SPAM ==========
const cooldown = new Map();
const COOLDOWN_TIME = 3000;

function isSpam(chatId) {
  const now = Date.now();
  const last = cooldown.get(chatId) || 0;
  if (now - last < COOLDOWN_TIME) return true;
  cooldown.set(chatId, now);
  return false;
}

// ========== CREATE COOLDOWN PER USERNAME ==========
const createCooldowns = new Map();

// ========== DATABASE JSON ==========
const pathAkunWeb = path.join(__dirname, 'web_users.json');
const pathPremium = path.join(__dirname, 'premium.json');
const pathMoney = path.join(__dirname, 'money.json');
const pathPendingReg = path.join(__dirname, 'pending_reg.json');

const defaultAccounts = [
    { username: "admin", password: "admin1122", ip: "1.1.1", role: "admin", telegramId: adminTelegramId }
];

function ambilAkunWeb() {
  if (!fs.existsSync(pathAkunWeb)) {
    fs.writeFileSync(pathAkunWeb, JSON.stringify(defaultAccounts, null, 2));
    return defaultAccounts;
  }
  return JSON.parse(fs.readFileSync(pathAkunWeb, 'utf8'));
}

function ambilUserPremium() {
  if (!fs.existsSync(pathPremium)) {
    fs.writeFileSync(pathPremium, JSON.stringify([adminTelegramId], null, 2));
    return [adminTelegramId];
  }
  return JSON.parse(fs.readFileSync(pathPremium, 'utf8'));
}

// ========== MONEY SYSTEM ==========
function ambilMoney() {
  if (!fs.existsSync(pathMoney)) {
    const defaultMoney = {};
    const accounts = ambilAkunWeb();
    accounts.forEach(acc => {
      const initialMoney = acc.username === 'admin' ? 999999 : 20;
      defaultMoney[acc.username] = { money: initialMoney, totalSpent: 0, totalCreated: 0 };
    });
    fs.writeFileSync(pathMoney, JSON.stringify(defaultMoney, null, 2));
    console.log('✅ money.json created');
    return defaultMoney;
  }
  return JSON.parse(fs.readFileSync(pathMoney, 'utf8'));
}

function simpanMoney(moneyData) {
  fs.writeFileSync(pathMoney, JSON.stringify(moneyData, null, 2));
}

function kurangiMoney(username, amount = 5) {
  let moneyData = ambilMoney();
  if (!moneyData[username]) {
    moneyData[username] = { money: 20, totalSpent: 0, totalCreated: 0 };
  }
  if (moneyData[username].money < amount) return false;
  moneyData[username].money -= amount;
  moneyData[username].totalSpent += amount;
  moneyData[username].totalCreated += 1;
  simpanMoney(moneyData);
  return moneyData[username].money;
}

function tambahMoney(username, amount) {
  let moneyData = ambilMoney();
  if (!moneyData[username]) {
    moneyData[username] = { money: 20, totalSpent: 0, totalCreated: 0 };
  }
  moneyData[username].money += amount;
  simpanMoney(moneyData);
  return moneyData[username].money;
}

function getMoney(username) {
  let moneyData = ambilMoney();
  if (!moneyData[username]) return 20;
  return moneyData[username].money;
}

function getTotalMoney() {
  let moneyData = ambilMoney();
  let total = 0;
  for (const user in moneyData) {
    total += moneyData[user].money;
  }
  return total;
}

function getTotalMoneySpent() {
  let moneyData = ambilMoney();
  let total = 0;
  for (const user in moneyData) {
    total += moneyData[user].totalSpent || 0;
  }
  return total;
}

// ========== PENDING REGISTRATION ==========
function getPendingReg() {
  if (!fs.existsSync(pathPendingReg)) {
    fs.writeFileSync(pathPendingReg, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(pathPendingReg, 'utf8'));
}

function savePendingReg(data) {
  fs.writeFileSync(pathPendingReg, JSON.stringify(data, null, 2));
}

let webAccounts = ambilAkunWeb();
let premiumUsers = ambilUserPremium();

// ========== REQUEST MONEY COOLDOWN ==========
const requestCooldown = new Map();

// ========== TELEGRAM BOT ==========
const bot = new TelegramBot(telegramBotToken, { polling: true, webHook: false });
console.log('🤖 Telegram Bot Active!');

async function sendTelegramMessage(chatId, message, parseMode = 'Markdown', replyMarkup = null) {
  try {
    if (message.length > 4000) message = message.substring(0, 3900) + '\n\n... (truncated)';
    await bot.sendMessage(chatId, message, { 
      parse_mode: parseMode,
      reply_markup: replyMarkup
    });
    return true;
  } catch (error) {
    console.error('Failed to send message:', error.message);
    return false;
  }
}

// ========== ROLE BUTTONS ==========
const roleKeyboard = {
  inline_keyboard: [
    [
      { text: "👤 USER", callback_data: "role_user" },
      { text: "🛒 RESELLER", callback_data: "role_reseller" },
      { text: "👑 ADMIN", callback_data: "role_admin" }
    ],
    [
      { text: "❌ CANCEL", callback_data: "role_cancel" }
    ]
  ]
};

// ========== TELEGRAM COMMANDS ==========
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  const isPremium = premiumUsers.includes(chatId);
  
  let startMsg = `🔵 *SALSS PANEL BOT V2.0*\n\n`;
  startMsg += `Status: ${isPremium ? '💎 PREMIUM' : '❌ NON-PREMIUM'}\n\n`;
  startMsg += `📌 *Commands:*\n`;
  startMsg += `┣ /regist <user> <pass> - Create web account (Premium only)\n`;
  startMsg += `┣ /money - Check money balance\n`;
  startMsg += `┣ /info - Panel info\n`;
  startMsg += `┗ /help - Help\n`;
  
  if (chatId === adminTelegramId) {
    startMsg += `\n👑 *Owner Commands:*\n`;
    startMsg += `┣ /addprem <id> - Add premium user\n`;
    startMsg += `┣ /delprem <id> - Remove premium user\n`;
    startMsg += `┣ /listprem - List premium users\n`;
    startMsg += `┣ /addmoney <user> <amount> - Add money\n`;
    startMsg += `┣ /delmoney <user> <amount> - Deduct money\n`;
    startMsg += `┣ /deny <user> - Deny money request\n`;
    startMsg += `┣ /setmoney <user> <amount> - Set money\n`;
    startMsg += `┣ /cekmoney <user> - Check user money\n`;
    startMsg += `┣ /setrole <user> <role> - Set user role\n`;
    startMsg += `┣ /sendteks <user> <message> - Send private message\n`;
    startMsg += `┣ /maintenance - Toggle maintenance mode\n`;
    startMsg += `┣ /status - Check server status\n`;
    startMsg += `┗ /stats - Server stats\n`;
  }
  sendTelegramMessage(chatId, startMsg);
});

// Register with role selection
bot.onText(/\/regist (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  
  const username = match[1].trim();
  const password = match[2].trim();
  
  if (!premiumUsers.includes(chatId)) {
    return sendTelegramMessage(chatId, `❌ *ACCESS DENIED!*\n\nYou are not a premium user. Contact @Salss to upgrade.`);
  }
  
  const pending = getPendingReg();
  pending[chatId] = { username, password, step: 'waiting_role' };
  savePendingReg(pending);
  
  sendTelegramMessage(chatId, 
    `✅ *Username available!*\n\nSelect *ROLE* for account *${username}*:\n\n` +
    `👤 USER = Basic access\n` +
    `🛒 RESELLER = Can create sub-users\n` +
    `👑 ADMIN = Full access\n\n*Choose role below:*`,
    'Markdown',
    roleKeyboard
  );
});

// Handle role selection callback
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.from.id.toString();
  const data = callbackQuery.data;
  
  await bot.answerCallbackQuery(callbackQuery.id);
  
  const pending = getPendingReg();
  const pendingData = pending[chatId];
  
  if (!pendingData || pendingData.step !== 'waiting_role') {
    return bot.sendMessage(chatId, `❌ No registration in progress. Use /regist to register.`);
  }
  
  const { username, password } = pendingData;
  
  if (data === 'role_cancel') {
    delete pending[chatId];
    savePendingReg(pending);
    return bot.sendMessage(chatId, `❌ Registration cancelled.`);
  }
  
  let role = 'user';
  if (data === 'role_user') role = 'user';
  else if (data === 'role_reseller') role = 'reseller';
  else if (data === 'role_admin') role = 'admin';
  else return bot.sendMessage(chatId, `❌ Invalid role!`);
  
  webAccounts.push({ username, password, ip: "*", role: role, telegramId: chatId });
  fs.writeFileSync(pathAkunWeb, JSON.stringify(webAccounts, null, 2));
  
  let moneyData = ambilMoney();
  moneyData[username] = { money: 20, totalSpent: 0, totalCreated: 0 };
  simpanMoney(moneyData);
  
  delete pending[chatId];
  savePendingReg(pending);
  
  const roleEmoji = role === 'admin' ? '👑' : (role === 'reseller' ? '🛒' : '👤');
  const roleName = role === 'admin' ? 'ADMIN' : (role === 'reseller' ? 'RESELLER' : 'USER');
  
  const successMsg = `✅ *REGISTRATION SUCCESS!*\n\n${roleEmoji} Username: \`${username}\`\n🔑 Password: \`${password}\`\n🎭 Role: ${roleName}\n💰 Starting Balance: 20 Money\n🌐 Login: ${domain}`;
  bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
  
  if (chatId !== adminTelegramId) {
    sendTelegramMessage(adminTelegramId, `📢 *Premium user* (${chatId}) created account:\n👤 Username: ${username}\n🎭 Role: ${roleName}\n💰 Balance: 20 Money`);
  }
});

// Set role command
bot.onText(/\/setrole (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  const newRole = match[2].trim().toLowerCase();
  
  if (!['user', 'reseller', 'admin'].includes(newRole)) {
    return sendTelegramMessage(chatId, `❌ Role must be: user, reseller, or admin`);
  }
  
  const userIndex = webAccounts.findIndex(acc => acc.username === username);
  if (userIndex === -1) return sendTelegramMessage(chatId, `❌ User *${username}* not found!`);
  
  webAccounts[userIndex].role = newRole;
  fs.writeFileSync(pathAkunWeb, JSON.stringify(webAccounts, null, 2));
  
  const roleEmoji = newRole === 'admin' ? '👑' : (newRole === 'reseller' ? '🛒' : '👤');
  sendTelegramMessage(chatId, `✅ *ROLE CHANGED!*\n\n👤 Username: ${username}\n🎭 New Role: ${roleEmoji} ${newRole.toUpperCase()}`);
});

// Check money (user)
bot.onText(/\/money/, async (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  
  const user = webAccounts.find(acc => acc.telegramId === chatId);
  if (!user) {
    return sendTelegramMessage(chatId, `💰 *BALANCE CHECK*\n\nYou don't have a web account yet. Use /regist to register.\n\n🌐 ${domain}`);
  }
  
  const userMoney = getMoney(user.username);
  sendTelegramMessage(chatId, `💰 *MONEY BALANCE*\n\n👤 Username: ${user.username}\n🎭 Role: ${user.role.toUpperCase()}\n💵 Balance: ${userMoney} Money\n\n⚡ Each server creation costs 5 Money`);
});

// ========== OWNER COMMANDS ==========
bot.onText(/\/addmoney (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  const amount = parseInt(match[2].trim());
  
  if (isNaN(amount)) return sendTelegramMessage(chatId, `❌ Amount must be a number!`);
  
  const userExists = webAccounts.some(acc => acc.username === username);
  if (!userExists) return sendTelegramMessage(chatId, `❌ User *${username}* not found!`);
  
  const newBalance = tambahMoney(username, amount);
  
  const notifPath = path.join(__dirname, `notif_${username}.json`);
  fs.writeFileSync(notifPath, JSON.stringify({
    status: 'approved',
    amount: amount,
    message: `✅ Your money request has been APPROVED! +${amount} Money added. New balance: ${newBalance} Money`,
    timestamp: Date.now()
  }));
  
  sendTelegramMessage(chatId, `✅ Added ${amount} Money to ${username}\n💰 New balance: ${newBalance}`);
  
  const user = webAccounts.find(acc => acc.username === username);
  if (user && user.telegramId) {
    sendTelegramMessage(user.telegramId, `🎉 *NOTIFICATION!*\n\n+${amount} Money added.\n💰 New balance: ${newBalance}`);
  }
});

bot.onText(/\/delmoney (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  const amount = parseInt(match[2].trim());
  
  if (isNaN(amount)) return sendTelegramMessage(chatId, `❌ Amount must be a number!`);
  if (amount <= 0) return sendTelegramMessage(chatId, `❌ Amount must be greater than 0!`);
  
  const userExists = webAccounts.some(acc => acc.username === username);
  if (!userExists) return sendTelegramMessage(chatId, `❌ User *${username}* not found!`);
  
  let moneyData = ambilMoney();
  if (!moneyData[username]) {
    moneyData[username] = { money: 20, totalSpent: 0, totalCreated: 0 };
  }
  
  const currentMoney = moneyData[username].money;
  if (currentMoney < amount) {
    return sendTelegramMessage(chatId, `❌ Cannot deduct ${amount} Money from ${username}!\n💰 Current balance: ${currentMoney} Money`);
  }
  
  moneyData[username].money -= amount;
  simpanMoney(moneyData);
  
  const notifPath = path.join(__dirname, `notif_${username}.json`);
  fs.writeFileSync(notifPath, JSON.stringify({
    status: 'info',
    amount: amount,
    message: `⚠️ ${amount} Money has been DEDUCTED from your balance by admin.\n💰 New balance: ${moneyData[username].money} Money`,
    timestamp: Date.now()
  }));
  
  sendTelegramMessage(chatId, `✅ Deducted ${amount} Money from ${username}\n💰 New balance: ${moneyData[username].money}`);
  
  const user = webAccounts.find(acc => acc.username === username);
  if (user && user.telegramId) {
    sendTelegramMessage(user.telegramId, `⚠️ *NOTIFICATION!*\n\n${amount} Money has been DEDUCTED from your balance.\n💰 New balance: ${moneyData[username].money} Money`);
  }
});

bot.onText(/\/deny (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  
  const userExists = webAccounts.some(acc => acc.username === username);
  if (!userExists) return sendTelegramMessage(chatId, `❌ User *${username}* not found!`);
  
  const notifPath = path.join(__dirname, `notif_${username}.json`);
  fs.writeFileSync(notifPath, JSON.stringify({
    status: 'denied',
    amount: 5,
    message: `❌ Your money request has been DENIED. Please contact admin.`,
    timestamp: Date.now()
  }));
  
  sendTelegramMessage(chatId, `❌ Money request from ${username} has been DENIED.`);
  
  const user = webAccounts.find(acc => acc.username === username);
  if (user && user.telegramId) {
    sendTelegramMessage(user.telegramId, `❌ *NOTIFICATION!*\n\nYour money request has been DENIED.`);
  }
});

// ========== SEND PRIVATE MESSAGE TO USER ==========
bot.onText(/\/sendteks (.+?) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  
  if (chatId !== adminTelegramId) {
    return sendTelegramMessage(chatId, `❌ Access denied! This command is only for admin.`);
  }
  
  const targetUsername = match[1].trim();
  const message = match[2].trim();
  
  const userExists = webAccounts.find(acc => acc.username.toLowerCase() === targetUsername.toLowerCase());
  
  if (!userExists) {
    return sendTelegramMessage(chatId, `❌ User *${targetUsername}* not found!`, 'Markdown');
  }
  
  const privateMsgPath = path.join(__dirname, `private_msg_${targetUsername}.json`);
  let existingMessages = [];
  
  if (fs.existsSync(privateMsgPath)) {
    existingMessages = JSON.parse(fs.readFileSync(privateMsgPath, 'utf8'));
  }
  
  existingMessages.push({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    message: message,
    fromAdmin: true,
    timestamp: Date.now(),
    isRead: false
  });
  
  if (existingMessages.length > 20) existingMessages = existingMessages.slice(-20);
  fs.writeFileSync(privateMsgPath, JSON.stringify(existingMessages, null, 2));
  
  sendTelegramMessage(chatId, `✅ Message sent to *${targetUsername}*!\n📝 Message: ${message}`, 'Markdown');
  
  if (userExists.telegramId) {
    sendTelegramMessage(userExists.telegramId, `📬 *New private message from admin!*\n\n📝 ${message}\n\n🌐 Check your web dashboard.`, 'Markdown');
  }
});

bot.onText(/\/setmoney (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  const amount = parseInt(match[2].trim());
  
  if (isNaN(amount)) return sendTelegramMessage(chatId, `❌ Amount must be a number!`);
  
  const userExists = webAccounts.some(acc => acc.username === username);
  if (!userExists) return sendTelegramMessage(chatId, `❌ User *${username}* not found!`);
  
  let moneyData = ambilMoney();
  if (!moneyData[username]) {
    moneyData[username] = { money: amount, totalSpent: 0, totalCreated: 0 };
  } else {
    moneyData[username].money = amount;
  }
  simpanMoney(moneyData);
  
  sendTelegramMessage(chatId, `✅ Set ${username} money to ${amount}`);
});

bot.onText(/\/cekmoney (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const username = match[1].trim();
  const money = getMoney(username);
  sendTelegramMessage(chatId, `💰 *${username}* balance: ${money} Money`);
});

bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  const targetId = match[1].trim();
  if (premiumUsers.includes(targetId)) return sendTelegramMessage(chatId, `⚠️ ID ${targetId} is already premium.`);
  premiumUsers.push(targetId);
  fs.writeFileSync(pathPremium, JSON.stringify(premiumUsers, null, 2));
  sendTelegramMessage(chatId, `✅ ID ${targetId} is now *PREMIUM*!`);
  sendTelegramMessage(targetId, `🎉 Congratulations! Your Telegram account has been activated as *PREMIUM*. Use /regist to create a web account.`);
});

bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  const targetId = match[1].trim();
  if (!premiumUsers.includes(targetId)) return sendTelegramMessage(chatId, `⚠️ ID ${targetId} is not a premium user.`);
  premiumUsers = premiumUsers.filter(id => id !== targetId);
  fs.writeFileSync(pathPremium, JSON.stringify(premiumUsers, null, 2));
  sendTelegramMessage(chatId, `✅ ID ${targetId} removed from premium.`);
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  if (premiumUsers.length === 0) return sendTelegramMessage(chatId, `📋 No premium users yet.`);
  let msgText = `📋 *PREMIUM USERS LIST*\n\n`;
  premiumUsers.forEach((id, idx) => { msgText += `${idx + 1}. ID: \`${id}\`\n`; });
  sendTelegramMessage(chatId, msgText);
});

bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  try {
    const fetchServers = await fetch(`${domain}/api/application/servers`, { headers: { 'Authorization': `Bearer ${apikey}` } });
    const data = await fetchServers.json();
    const totalMoney = getTotalMoney();
    sendTelegramMessage(chatId, `📊 *SALSS PANEL STATISTICS*\n\n🌐 Domain: ${domain}\n🖥️ Total Servers: ${data.data?.length || 0}\n👥 Total Web Users: ${webAccounts.length}\n💎 Premium Users: ${premiumUsers.length}\n💰 Total Money: ${totalMoney}`);
  } catch (err) { sendTelegramMessage(chatId, `❌ Failed to get statistics.`); }
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  try {
    const fetchServers = await fetch(`${domain}/api/application/servers`, { headers: { 'Authorization': `Bearer ${apikey}` } });
    const data = await fetchServers.json();
    const totalMoney = getTotalMoney();
    const totalSpent = getTotalMoneySpent();
    sendTelegramMessage(chatId, `📈 *FULL STATISTICS*\n\n🖥️ Servers: ${data.data?.length || 0}\n👥 Users: ${webAccounts.length}\n💎 Premium: ${premiumUsers.length}\n💰 Total Money: ${totalMoney}\n💸 Total Spent: ${totalSpent}`);
  } catch (err) { sendTelegramMessage(chatId, `❌ Failed.`); }
});

// ========== MAINTENANCE COMMANDS ==========
bot.onText(/\/maintenance/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  maintenanceMode = !maintenanceMode;
  const statusMsg = maintenanceMode 
    ? `🔧 *MAINTENANCE MODE ACTIVATED!*\n\nAll users will see maintenance page.\nUse /maintenance again to deactivate.`
    : `✅ *MAINTENANCE MODE DEACTIVATED!*\n\nWebsite is back to normal.`;
  
  sendTelegramMessage(chatId, statusMsg);
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  if (chatId !== adminTelegramId) return sendTelegramMessage(chatId, `❌ Owner only command!`);
  
  const status = maintenanceMode ? '🔧 MAINTENANCE MODE ACTIVE' : '✅ NORMAL MODE';
  sendTelegramMessage(chatId, `📊 *Server Status:* ${status}`);
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id.toString();
  if (isSpam(chatId)) return;
  const isOwner = chatId === adminTelegramId;
  
  let helpMsg = `📖 *BOT HELP*\n\n`;
  helpMsg += `┣ /info - Panel statistics\n`;
  helpMsg += `┗ /help - This menu\n`;
  
  if (isOwner) {
    helpMsg += `\n👑 *Admin Commands:*\n`;
    helpMsg += `┣ /addmoney user amount - Approve & add money\n`;
    helpMsg += `┣ /delmoney user amount - Deduct money from user\n`;
    helpMsg += `┣ /deny user - Deny request\n`;
    helpMsg += `┣ /sendteks user message - Send private message\n`;
    helpMsg += `┣ /cekmoney user - Check balance\n`;
    helpMsg += `┣ /setmoney user amount - Set balance\n`;
    helpMsg += `┣ /addprem id - Add premium user\n`;
    helpMsg += `┣ /delprem id - Remove premium\n`;
    helpMsg += `┣ /listprem - List premium\n`;
    helpMsg += `┣ /maintenance - Toggle maintenance mode\n`;
    helpMsg += `┣ /status - Check server status\n`;
    helpMsg += `┗ /stats - Full statistics\n`;
  }
  sendTelegramMessage(chatId, helpMsg);
});

// ========== API ENDPOINTS ==========

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  webAccounts = ambilAkunWeb();
  const userValid = webAccounts.find(acc => acc.username === username && acc.password === password);
  if (userValid) {
    const userMoney = getMoney(userValid.username);
    console.log(`✅ Login: ${username} - Role: ${userValid.role} - Money: ${userMoney}`);
    res.json({ 
      success: true, 
      user: { 
        username: userValid.username, 
        role: userValid.role,
        money: userMoney
      } 
    });
  } else {
    res.status(401).json({ error: 'Login failed! Incorrect username or password.' });
  }
});

// ========== COOLDOWN ENDPOINTS ==========
app.get('/api/check-cooldown/:username', (req, res) => {
  const { username } = req.params;
  const lastCreate = createCooldowns.get(username) || 0;
  const remaining = 86400000 - (Date.now() - lastCreate);
  
  res.json({
    onCooldown: remaining > 0,
    remainingTime: remaining > 0 ? remaining : 0,
    lastCreate: lastCreate
  });
});

app.post('/api/set-cooldown', (req, res) => {
  const { username } = req.body;
  createCooldowns.set(username, Date.now());
  res.json({ success: true });
});

// ========== REQUEST MONEY ENDPOINT ==========
app.post('/api/request-money', async (req, res) => {
  const { username, telegramId } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required!' });
  }
  
  const lastRequest = requestCooldown.get(username);
  const now = Date.now();
  
  if (lastRequest && (now - lastRequest) < 86400000) {
    const hoursLeft = Math.ceil((86400000 - (now - lastRequest)) / 3600000);
    return res.status(400).json({ 
      error: `You can only request money once every 24 hours! Next request in ${hoursLeft} hours.`
    });
  }
  
  requestCooldown.set(username, now);
  
  const requestMessage = `💰 *NEW MONEY REQUEST* 💰\n\n👤 Username: ${username}\n📱 Telegram ID: ${telegramId || 'Not provided'}\n💵 Amount: 5 Money\n⏰ Time: ${new Date().toLocaleString()}\n\n📌 *To approve:* /addmoney ${username} 5\n📌 *To deny:* /deny ${username}`;
  
  await sendTelegramMessage(adminTelegramId, requestMessage);
  
  res.json({ 
    success: true, 
    message: 'Request sent to admin! You will be notified when approved/denied.'
  });
});

// ========== NOTIFICATION ENDPOINTS ==========
app.get('/api/check-notification/:username', (req, res) => {
  const { username } = req.params;
  const notifPath = path.join(__dirname, `notif_${username}.json`);
  let notification = null;
  
  if (fs.existsSync(notifPath)) {
    notification = JSON.parse(fs.readFileSync(notifPath, 'utf8'));
    fs.unlinkSync(notifPath);
  }
  
  res.json({ notification });
});

// ========== PRIVATE MESSAGE ENDPOINTS ==========
app.get('/api/private-messages/:username', (req, res) => {
  const { username } = req.params;
  const privateMsgPath = path.join(__dirname, `private_msg_${username}.json`);
  
  let messages = [];
  if (fs.existsSync(privateMsgPath)) {
    messages = JSON.parse(fs.readFileSync(privateMsgPath, 'utf8'));
  }
  
  res.json({ messages });
});

app.post('/api/close-private-message', (req, res) => {
  const { username, messageId } = req.body;
  const privateMsgPath = path.join(__dirname, `private_msg_${username}.json`);
  
  if (fs.existsSync(privateMsgPath)) {
    let messages = JSON.parse(fs.readFileSync(privateMsgPath, 'utf8'));
    messages = messages.filter(m => m.id !== messageId);
    fs.writeFileSync(privateMsgPath, JSON.stringify(messages, null, 2));
  }
  
  res.json({ success: true });
});

app.post('/api/reply-private-message', async (req, res) => {
  const { username, message, originalMessageId } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required!' });
  }
  
  const replyMessage = `💬 *USER REPLY (Private Message)* 💬\n\n👤 From: ${username}\n📝 Original Message ID: ${originalMessageId || 'N/A'}\n💬 Reply: ${message}\n⏰ Time: ${new Date().toLocaleString()}`;
  
  await sendTelegramMessage(adminTelegramId, replyMessage);
  
  res.json({ success: true, message: 'Reply sent to admin!' });
});

// ========== CREATE SERVER ENDPOINT ==========
app.post('/api/create', async (req, res) => {
  let { username, email, ram, disk, cpu, telegramId, isUnlimited, loggedInUser } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Panel username is required!' });
  }
  
  const panelUsername = username.trim().toLowerCase();
  const randomId = Math.floor(Math.random() * 10000);
  const pterodactylUsername = panelUsername + randomId;
  const password = pterodactylUsername;
  const serverName = panelUsername + '@salss.id';
  
  let currentMoney = getMoney(loggedInUser || 'admin');
  if (currentMoney < 5) {
    return res.status(400).json({ error: `Insufficient balance! Need 5 Money. Your balance: ${currentMoney} Money` });
  }

  let finalRam = ram;
  let finalDisk = disk;
  let finalCpu = cpu;
  
  if (isUnlimited) {
    finalRam = "0";
    finalDisk = "0";
    finalCpu = "0";
  }

  try {
    const userRes = await fetch(`${domain}/api/application/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apikey}`, 'Accept': 'application/json' },
      body: JSON.stringify({ 
        email: email || `${pterodactylUsername}@salss.id`, 
        username: pterodactylUsername, 
        first_name: panelUsername, 
        last_name: 'User', 
        password, 
        language: 'en' 
      })
    });
    const userDataRes = await userRes.json();
    if (userDataRes.errors) return res.json({ error: userDataRes.errors[0].detail });
    const userId = userDataRes.attributes.id;

    const eggData = await fetch(`${domain}/api/application/nests/${nestid}/eggs/${egg}`, {
      headers: { 'Authorization': `Bearer ${apikey}` }
    });
    const eggJson = await eggData.json();
    const startup = eggJson.attributes.startup;

    const serverRes = await fetch(`${domain}/api/application/servers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apikey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: serverName, 
        user: userId, 
        egg: parseInt(egg), 
        docker_image: eggJson.attributes.docker_image, 
        startup,
        environment: { INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0', CMD_RUN: 'npm start' },
        limits: { memory: finalRam, swap: 0, disk: finalDisk, io: 500, cpu: finalCpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      })
    });

    let serverData = await serverRes.json();
    if (serverData.errors) return res.json({ error: serverData.errors[0].detail });

    const newBalance = kurangiMoney(loggedInUser || 'admin', 5);
    createCooldowns.set(loggedInUser || 'admin', Date.now());
    
    const ramDisplay = isUnlimited ? "♾️ Unlimited" : finalRam + " MB";
    const diskDisplay = isUnlimited ? "♾️ Unlimited" : finalDisk + " MB";
    const cpuDisplay = isUnlimited ? "♾️ Unlimited" : finalCpu + "%";
    
    const telegramMessage = `🆕 *New Panel Created!*\n\n🌐 Domain: ${domain}\n👤 Panel Username: \`${panelUsername}\`\n🔑 Password: \`${password}\`\n📧 Email: ${email || panelUsername + '@salss.id'}\n💾 RAM: ${ramDisplay}\n🖥️ CPU: ${cpuDisplay}\n💿 Disk: ${diskDisplay}\n💰 Remaining Balance: ${newBalance} Money`;
    
    if (telegramId && telegramId !== adminTelegramId) await sendTelegramMessage(telegramId, telegramMessage);
    await sendTelegramMessage(adminTelegramId, telegramMessage);

    res.json({ 
      success: true, 
      username: panelUsername,
      password: password, 
      email: email || panelUsername + '@salss.id', 
      panel_url: domain, 
      server_id: serverData.attributes.id, 
      ram: ramDisplay, 
      disk: diskDisplay, 
      cpu: cpuDisplay, 
      isUnlimited,
      remainingMoney: newBalance,
      server_name: serverName
    });
  } catch (err) {
    console.error('Create server error:', err);
    res.status(500).json({ error: 'Failed to create server', detail: err.message });
  }
});

app.get('/api/servers', async (req, res) => {
  try {
    const fetchServers = await fetch(`${domain}/api/application/servers`, { headers: { 'Authorization': `Bearer ${apikey}` } });
    const serverData = await fetchServers.json();
    res.json(serverData.data || []);
  } catch (err) { 
    res.status(500).json({ error: 'Failed to fetch servers' }); 
  }
});

app.delete('/api/server/:id', async (req, res) => {
  try {
    await fetch(`${domain}/api/application/servers/${req.params.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${apikey}` } });
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const fetchServers = await fetch(`${domain}/api/application/servers`, { headers: { 'Authorization': `Bearer ${apikey}` } });
    const serverData = await fetchServers.json();
    res.json({ 
      totalServers: serverData.data?.length || 0, 
      totalUsers: webAccounts.length, 
      premiumUsers: premiumUsers.length,
      totalMoney: getTotalMoney(),
      totalMoneySpent: getTotalMoneySpent()
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/user-money/:username', (req, res) => {
  const { username } = req.params;
  const money = getMoney(username);
  res.json({ username, money });
});

// ========== FRONTEND ==========
app.get('/', (req, res) => { 
  res.sendFile(path.join(__dirname, 'index.html')); 
});

app.get('/index.html', (req, res) => { 
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SALSS Panel Creator running at http://localhost:${PORT}`);
  console.log(`🤖 Telegram Bot Active!`);
  console.log(`📡 Pterodactyl API: ${domain}`);
  console.log(`👑 Admin: admin / admin1122`);
  console.log(`💰 Admin money: 999999 | New user money: 20`);
  console.log(`\n📌 Maintenance Mode: ${maintenanceMode ? 'ON' : 'OFF'}`);
  console.log(`   /maintenance - Toggle maintenance mode`);
  console.log(`   /status - Check server status\n`);
});
