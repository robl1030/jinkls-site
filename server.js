const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./jinkls.db');

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    token TEXT
)`);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Регистрация аккаунта
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Заполните поля!" });

    db.run(`INSERT INTO users (username, password, token) VALUES (?, ?, '')`, [username, password], (err) => {
        if (err) return res.status(400).json({ error: "Никнейм занят!" });
        res.json({ success: true, message: "Аккаунт Jinkls создан!" });
    });
});

// Авторизация на сайте (Выдает токен для сессии в браузере)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err || !row) return res.status(400).json({ error: "Неверные данные!" });
        
        const sessionToken = "jinkls_" + Math.random().toString(36).substr(2, 9);
        db.run(`UPDATE users SET token = ? WHERE id = ?`, [sessionToken, row.id]);
        
        res.json({ success: true, token: sessionToken, username: row.username });
    });
});

// Скрипт Join.ashx, который считывает данные зашедшего игрока
app.get('/game/join.ashx', (req, res) => {
    const playerToken = req.query.token || "guest";
    db.get(`SELECT username FROM users WHERE token = ?`, [playerToken], (err, row) => {
        const username = row ? row.username : "JinklsGuest";
        res.set('Content-Type', 'text/plain');
        res.send(`
            local game = game
            local players = game:GetService("Players")
            local player = players:CreateLocalPlayer(0)
            player.Name = "${username}"
            player.Id = 1
            game:Connect("127.0.0.1", 53640, 0, 20)
        `);
    });
});

app.get('/setting/quietset/ClientAppSettings/', (req, res) => {
    res.json({ "FFlagDebugDisableAutomaticCrashReporting": "True", "FFlagEnableVoxelBackground": "True" });
});

app.listen(PORT, () => console.log(`=== Сайт Jinkls запущен на http://localhost:${PORT} ===`));
