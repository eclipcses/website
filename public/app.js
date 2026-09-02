const DISCORD_ID = '852991682748219392';

const appIconCache = {};

function tickClock() {
    const d = new Date();
    document.getElementById('clock').textContent =
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' });

    const localOffset = -d.getTimezoneOffset() / 60;
    const bucharestStr = d.toLocaleString('en-US', { timeZone: 'Europe/Bucharest', hour: 'numeric', hour12: false });
    const bucharestHour = parseInt(bucharestStr);
    const localHour = d.getHours();
    let diff = bucharestHour - localHour;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;

    const offsetEl = document.getElementById('clockOffset');
    if (diff === 0) {
        offsetEl.textContent = 'same time as you';
    } else if (diff > 0) {
        offsetEl.textContent = `${diff}h ahead of you`;
    } else {
        offsetEl.textContent = `${Math.abs(diff)}h behind you`;
    }
}
tickClock();
setInterval(tickClock, 1000);

const STATUS_COLORS = {
    online: '#3ddc84',
    idle: '#f5b942',
    dnd: '#f04747',
    offline: '#747f8d'
};

function formatDuration(ms) {
    if (!ms) return '—';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

async function fetchDiscordAppIcon(appId) {
    if (!appId) return null;
    if (appIconCache[appId] !== undefined) return appIconCache[appId];

    try {
        const res = await fetch(`https://discord.com/api/v9/applications/${appId}/rpc`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.icon) {
            const iconUrl = `https://cdn.discordapp.com/app-icons/${appId}/${data.icon}.png?size=128`;
            appIconCache[appId] = iconUrl;
            return iconUrl;
        }
    } catch (e) {}

    appIconCache[appId] = null;
    return null;
}

async function resolveActivityIconUrl(activity) {
    if (!activity) return null;

    const assets = activity.assets;
    const appId = activity.application_id;

    if (assets && (assets.large_image || assets.small_image)) {
        const image = assets.large_image || assets.small_image;

        if (image.startsWith('mp:external/')) {
            return `https://media.discordapp.net/${image.replace('mp:external/', '')}`;
        }

        if (image.startsWith('spotify:')) {
            return `https://i.scdn.co/image/${image.replace('spotify:', '')}`;
        }

        if (appId) {
            return `https://cdn.discordapp.com/app-assets/${appId}/${image}.png`;
        }
    }

    if (appId) {
        const rpcIcon = await fetchDiscordAppIcon(appId);
        if (rpcIcon) return rpcIcon;
    }

    return null;
}

const BANNER_API_URL = '/api/discord-banner';
let lastBannerUrl = null;

async function loadBanner() {
    const bannerEl = document.getElementById('profileBanner');
    const fallbackDiv = bannerEl.querySelector('.banner-fallback');

    try {
        const separator = BANNER_API_URL.includes('?') ? '&' : '?';
        const response = await fetch(`${BANNER_API_URL}${separator}t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error();

        const data = await response.json();
        if (!data.success || !data.url) throw new Error();

        if (data.url === lastBannerUrl) return;

        const bannerUrl = data.url;
        const img = new Image();
        img.onload = function () {
            bannerEl.style.backgroundImage = `url("${bannerUrl}")`;
            bannerEl.style.backgroundColor = 'transparent';
            fallbackDiv.style.display = 'none';
            lastBannerUrl = bannerUrl;
        };
        img.src = bannerUrl;
    } catch (e) {
        if (!lastBannerUrl) {
            bannerEl.style.backgroundImage = 'none';
            bannerEl.style.backgroundColor = 'var(--panel-2)';
            fallbackDiv.style.display = 'flex';
            fallbackDiv.textContent = 'banner';
        }
    }
}

async function loadDiscord() {
    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
        const json = await res.json();
        if (!json.success) throw new Error('lanyard: user not found');

        const data = json.data;
        const user = data.discord_user;
        const status = data.discord_status || 'offline';

        await loadBanner();

        const avatarImg = document.getElementById('avatarImg');
        const fallback = document.getElementById('avatarFallback');
        if (user.avatar) {
            avatarImg.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
            avatarImg.style.display = 'block';
            fallback.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            fallback.style.display = 'flex';
            const initial = (user.global_name || user.username || 'u')[0] || 'u';
            fallback.textContent = initial.toLowerCase();
        }

        const decoContainer = document.getElementById('avatarDecoration');
        if (user.avatar_decoration_data && user.avatar_decoration_data.asset) {
            const asset = user.avatar_decoration_data.asset;
            const decoUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=128`;
            decoContainer.style.backgroundImage = `url(${decoUrl})`;
            decoContainer.style.display = 'block';
        } else {
            decoContainer.style.display = 'none';
        }

        const displayName = user.global_name || user.username || 'dani';
        document.getElementById('displayName').textContent = displayName;
        const usernameLine = document.getElementById('usernameLine');
        const discrim = user.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : '';
        usernameLine.innerHTML = `@${user.username || 'actofpassion'}<span class="discrim">${discrim}</span>`;

        document.getElementById('statusDot').style.background = STATUS_COLORS[status] || STATUS_COLORS.offline;

        const activeMap = {
            desktop: data.active_on_discord_desktop || false,
            web: data.active_on_discord_web || false,
            mobile: data.active_on_discord_mobile || false,
            embedded: data.active_on_discord_embedded || false,
            vr: data.active_on_discord_vr || false
        };

        document.querySelectorAll('.plat-inline').forEach(el => {
            const p = el.dataset.platform;
            if (activeMap[p]) el.classList.add('active');
            else el.classList.remove('active');
        });

        const activities = data.activities || [];
        const displayActivities = activities.filter(a => a.type !== 4);
        document.getElementById('activityCount').textContent = displayActivities.length;

        const listEl = document.getElementById('activityMiniList');
        if (displayActivities.length === 0) {
            listEl.innerHTML = `<div class="no-activities">no active activities.</div>`;
        } else {
            let html = '';
            for (const act of displayActivities) {
                const appName = act.name || 'unknown';
                const detail = act.details || '';
                const state = act.state || '';
                const startTs = act.timestamps?.start;
                let elapsed = '';
                if (startTs) {
                    const now = Date.now();
                    elapsed = `⏱ ${formatDuration(now - startTs)}`;
                }

                const iconUrl = await resolveActivityIconUrl(act);
                let iconHtml = '';

                if (iconUrl) {
                    iconHtml = `<img src="${iconUrl}" alt="${appName}" loading="lazy" />`;
                } else {
                    iconHtml = `<div style="width:100%;height:100%;background:var(--panel-2);border-radius:6px;"></div>`;
                }

                html += `
                  <div class="activity-mini">
                    <div class="mini-icon">${iconHtml}</div>
                    <div class="mini-body">
                      <div class="mini-name">${appName}</div>
                      ${detail ? `<div class="mini-detail">${detail}</div>` : ''}
                      ${state ? `<div class="mini-state">${state}</div>` : ''}
                      ${elapsed ? `<div class="mini-timer">${elapsed}</div>` : ''}
                    </div>
                  </div>
                `;
            }
            listEl.innerHTML = html;
        }

    } catch (e) {
        console.warn('lanyard error:', e);
        document.getElementById('usernameLine').textContent = '@actofpassion · presence unavailable';
        document.getElementById('activityMiniList').innerHTML = `<div class="no-activities">⚠️ could not load presence.</div>`;
    }
}

async function loadAll() {
    await loadDiscord();
}

loadAll();
setInterval(loadDiscord, 1000);
setInterval(loadBanner, 1000);
