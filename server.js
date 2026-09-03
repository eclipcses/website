const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;
const VIEWS_FILE = path.join(__dirname, "views.json");
const COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

function getData() {
    try {
        if (fs.existsSync(VIEWS_FILE)) {
            return JSON.parse(fs.readFileSync(VIEWS_FILE, "utf8"));
        }
    } catch (e) {}
    return { count: 0, ips: {} };
}

function saveData(data) {
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(data));
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/.well-known/discord", (req, res) => {
    res.send("dh=0695c0036c38c0d02cddd9c76f71b287827b2465");
});

app.get("/api/views", (req, res) => {
    const data = getData();
    const ip = req.ip;
    const now = Date.now();
    const lastVisit = data.ips[ip] || 0;

    if (now - lastVisit > COOLDOWN) {
        data.count++;
    }
    data.ips[ip] = now;
    saveData(data);
    res.json({ count: data.count });
});

app.get("/api/discord-banner", async (req, res) => {
    try {
        const token = process.env.DISCORD_BOT_TOKEN;
        const userId = process.env.DISCORD_USER_ID;

        if (!token || !userId) {
            return res.status(500).json({
                success: false,
                error: "Discord environment variables are not configured"
            });
        }

        const response = await fetch(
            `https://discord.com/api/v10/users/${userId}`,
            {
                headers: {
                    Authorization: `Bot ${token}`,
                    "User-Agent": "dani-profile-render/1.0"
                }
            }
        );

        const user = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: user.message || "Discord API request failed"
            });
        }

        if (!user.banner) {
            return res.json({
                success: true,
                url: null
            });
        }

        const ext = user.banner.startsWith("a_") ? "gif" : "png";
        const url =
            `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`;

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            url
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});

// Express static middleware serves index.html automatically.
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Site running on port ${PORT}`);
});
