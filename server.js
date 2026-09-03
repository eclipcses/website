const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://tt7iyyy_db_user:xE10hRtCjEqwG9s8@website.tq4p6ck.mongodb.net/?appName=website";
const COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

const client = new MongoClient(MONGO_URI);
let viewsCollection;

async function connectDB() {
    await client.connect();
    const db = client.db("website");
    viewsCollection = db.collection("views");
    console.log("Connected to MongoDB");
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/.well-known/discord", (req, res) => {
    res.send("dh=0695c0036c38c0d02cddd9c76f71b287827b2465");
});

app.get("/api/views", async (req, res) => {
    try {
        const ip = req.ip;
        const now = Date.now();
        const record = await viewsCollection.findOne({ _id: "main" }) || { count: 0, ips: {} };
        const lastVisit = record.ips[ip] || 0;

        if (now - lastVisit > COOLDOWN) {
            record.count++;
        }
        record.ips[ip] = now;

        await viewsCollection.updateOne(
            { _id: "main" },
            { $set: { count: record.count, ips: record.ips } },
            { upsert: true }
        );

        res.json({ count: record.count });
    } catch (e) {
        console.error(e);
        res.json({ count: 0 });
    }
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

connectDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Site running on port ${PORT}`);
    });
});
