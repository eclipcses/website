const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public")));

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
