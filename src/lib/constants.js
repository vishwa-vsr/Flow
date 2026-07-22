// FocusFlow shared constants — single source of truth for SW + dashboard + popup + blocked.
// Loaded via importScripts() in service worker and <script src> in pages, so everything
// is exposed on globalThis (which works in both contexts).

(function (root) {
  root.FF_CONSTANTS_VERSION = "6.4";

  root.DEFAULT_CAT_COLORS = {
    productivity: "#05D581",
    learning: "#A855F7",
    distraction: "#F46B7A",
    communication: "#5C9CFC",
    uncategorized: "#555555",
  };

  root.DEFAULT_CAT_LABELS = {
    productivity: "Productivity",
    learning: "Learning",
    distraction: "Distraction",
    communication: "Communication",
    uncategorized: "Uncategorized",
  };

  root.DEFAULT_CAT_EMOJI = {
    productivity: "💻",
    learning: "📚",
    distraction: "⚡",
    communication: "💬",
    uncategorized: "❓",
  };

  root.CAT_COLORS = { ...root.DEFAULT_CAT_COLORS };
  root.CAT_LABELS = { ...root.DEFAULT_CAT_LABELS };
  root.CAT_EMOJI = { ...root.DEFAULT_CAT_EMOJI };

  root.rebuildCatMeta = function () {
    root.CAT_META = {};
    for (const k of Object.keys(root.CAT_LABELS)) {
      root.CAT_META[k] = {
        label: root.CAT_LABELS[k],
        color: root.CAT_COLORS[k],
        emoji: root.CAT_EMOJI[k],
      };
    }
  };

  root.applyCustomCategories = function (customMap) {
    // Reset to defaults first
    root.CAT_COLORS = { ...root.DEFAULT_CAT_COLORS };
    root.CAT_LABELS = { ...root.DEFAULT_CAT_LABELS };
    root.CAT_EMOJI = { ...root.DEFAULT_CAT_EMOJI };

    if (customMap && typeof customMap === "object") {
      for (const [key, meta] of Object.entries(customMap)) {
        if (key === "uncategorized" || key === "all") continue;
        if (meta && typeof meta === "object") {
          if (meta.label && typeof meta.label === "string") root.CAT_LABELS[key] = meta.label.trim();
          if (meta.emoji && typeof meta.emoji === "string") root.CAT_EMOJI[key] = meta.emoji.trim();
          if (meta.color && typeof meta.color === "string") root.CAT_COLORS[key] = meta.color.trim();
        }
      }
    }
    root.rebuildCatMeta();
  };

  root.rebuildCatMeta();

  root.DEFAULT_CATS = ["productivity", "learning", "distraction", "communication", "uncategorized"];

  // Per-site "advanced tweak" definitions. Used by both the popup (current-site
  // toggles) and the dashboard (Advanced Site Tweaks panel).
  root.GRANULAR_SITES = {
    "youtube.com": [
      { id: "yt-shorts", label: "Hide Shorts" },
      { id: "yt-recom", label: "Hide Home Page Feed" },
      { id: "yt-related", label: "Hide Related Videos" },
      { id: "yt-comments", label: "Hide Comments" },
    ],
    "reddit.com": [
      { id: "rd-feed", label: "Hide Home Feed" },
      { id: "rd-comments", label: "Hide Comments" },
      { id: "rd-popular", label: "Hide Popular, News, Explore" },
      { id: "rd-recent-communities", label: "Hide Recent and Communities" },
    ],
    "instagram.com": [
      { id: "ig-reels", label: "Hide Reels link" },
      { id: "ig-home", label: "Hide Home Feed" },
      { id: "ig-explore", label: "Hide Explore link" },
      { id: "ig-suggested", label: "Hide Suggested for You" },
    ],
    "x.com": [
      { id: "x-timeline", label: "Hide For You / Following Timeline" },
      { id: "tw-trends", label: "Hide Trending" },
      { id: "x-whotofollow", label: "Hide Who to Follow" },
      { id: "x-promoted", label: "Hide Promoted Posts" },
    ],
    "linkedin.com": [
      { id: "li-feed", label: "Hide Home Feed" },
      { id: "li-news", label: "Hide LinkedIn News" },
      { id: "li-promoted", label: "Hide Promoted Posts" },
    ],
    "netflix.com": [
      { id: "nf-autoplay", label: "Disable Autoplay Previews" },
      { id: "nf-recom", label: "Hide Recommendations" },
      { id: "nf-billboard", label: "Hide Featured Billboard" },
    ],
  };
  // Append "B&W mode" universally (was duplicated in popup.js + dashboard.js).
  Object.keys(root.GRANULAR_SITES).forEach((d) => {
    root.GRANULAR_SITES[d].push({ id: "bw-mode", label: "Black & White Mode" });
  });


  root.AUTO_CATEGORIES = {
    "zoom.us": "communication",
    "threads.net": "communication",
    "messenger.com": "communication",
    "chat.google.com": "communication",
    "teams.microsoft.com": "communication",
    "linkedin.com": "communication",
    "slack.com": "communication",
    "discord.com": "communication",
    "t.me": "communication",
    "web.telegram.org": "communication",
    "whatsapp.com": "communication",
    "web.whatsapp.com": "communication",
    "tiktok.com": "distraction",
    "pinterest.com": "distraction",
    "twitch.tv": "distraction",
    "theuselessweb.com": "distraction",
    "netflix.com": "distraction",
    "reddit.com": "distraction",
    "instagram.com": "distraction",
    "facebook.com": "distraction",
    "youtube.com": "distraction",
    "chatgpt.com": "productivity",
    "gemini.google.com": "productivity",
    "claude.ai": "productivity",
    "notion.so": "productivity",
    "github.com": "productivity",
    "perplexity.ai": "productivity",
    "canva.com": "productivity",
    "todoist.com": "productivity",
    "trello.com": "productivity",
    "forestapp.cc": "productivity",
    "pw.live": "learning",
    "khanacademy.org": "learning",
    "unacademy.com": "learning",
    "byjus.com": "learning",
    "wolframalpha.com": "learning",
    "quizlet.com": "learning",
    "vedantu.com": "learning",
    "coursera.org": "learning",
    "testbook.com": "learning",
  };

  root.CSS_MAP = {
    "bw-mode": 'html { filter: grayscale(1) !important; }',
    "yt-shorts": 'ytd-reel-shelf-renderer, ytd-rich-section-renderer:has(a[href*="/shorts" i]), ytd-rich-item-renderer:has(a[href*="/shorts" i]), ytd-video-renderer:has(a[href*="/shorts" i]), ytd-grid-video-renderer:has(a[href*="/shorts" i]), ytd-reel-item-renderer, ytd-shorts, ytd-reel-video-renderer, yt-tab-shape[tab-title="Shorts" i], yt-tab-group-shape a[href*="/shorts" i], yt-navigation-item-view-model:has(a[href*="/shorts" i]), a[title="Shorts" i], a[title^="Shorts" i], grid-shelf-view-model, ytd-rich-shelf-renderer[is-shorts], #shorts-container, ytd-shelf-renderer:has(a[href*="/shorts" i]) { display: none !important; }',
    "yt-recom": 'ytd-browse[page-subtype="home"] { display: none !important; }',
    "yt-related": 'ytd-watch-next-secondary-results-renderer { display: none !important; }',
    "yt-comments": "#comments { display: none !important; }",
    "rd-feed": "shreddit-feed { display: none !important; }",
    "rd-comments": 'shreddit-comment-tree, [id^="comment-tree"], faceplate-batch shreddit-comment, .commentarea { display: none !important; }',
    "rd-popular": '#popular-posts, #explore-communities, #news-posts, #news-communities, left-nav-top-section > *:nth-child(2), left-nav-top-section > *:nth-child(3), left-nav-top-section > *:nth-child(4), [noun="popular"], [noun="news"], [noun="explore"], a[href*="/r/popular"], a[href*="/r/news"], a[href*="/explore"] { display: none !important; }',
    "rd-recent-communities": 'reddit-recent-pages, #communities_section { display: none !important; }',
    "ig-reels": 'a[href="/reels/"], a[href^="/reels"] { display: none !important; }',
    "ig-home": 'a[href="/"][role="link"] { display: none !important; }',
    "ig-explore": 'a[href="/explore/"], a[href^="/explore"] { display: none !important; }',
    "ig-suggested": 'aside section:has(h4), aside h4, [aria-label="Suggestions for you" i], div:has(> h4):has(a[role="link"][href^="/"]) { display: none !important; }',
    "tw-trends": '[aria-label="Timeline: Trending now"], [data-testid="trend"] { display: none !important; }',
    "x-timeline": '[aria-label^="Timeline: Your Home Timeline" i], [aria-label^="Timeline: For you" i], [aria-label^="Timeline: Following" i], [data-testid="primaryColumn"] section[aria-labelledby] { display: none !important; }',
    "x-whotofollow": '[aria-label="Who to follow"], aside [aria-label*="Who to follow" i], aside [data-testid="UserCell"] { display: none !important; }',
    "x-promoted": 'article:has([data-testid="promotedIndicator"]), [data-testid="placementTracking"] { display: none !important; }',
    "li-feed": 'main[aria-label*="Main Feed" i], .scaffold-finite-scroll, .feed-shared-update-v2, div[data-finite-scroll-hotkey-context="FEED"] { display: none !important; }',
    "li-news": 'aside.news-module, .news-module, section:has(> h2[id*="news" i]), aside [aria-label*="LinkedIn News" i] { display: none !important; }',
    "li-promoted": '.update-components-promo, div:has(> .update-components-promo), .feed-shared-update-v2:has([aria-label*="Promoted" i]) { display: none !important; }',
    "nf-autoplay": 'video[autoplay], .billboard-row video, .previewModal--container video { display: none !important; } .billboard-row .nfp, .previewModal--container { pointer-events: none !important; }',
    "nf-recom": '.lolomoRow, .rowContainer, [data-list-context="similars"], [data-list-context="moreLikeThis"] { display: none !important; }',
    "nf-billboard": '.billboard-row, .volatile-billboard-animations-container { display: none !important; }',
  };

  root.FALLBACK_ICON =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='2' y1='12' x2='22' y2='12'%3E%3C/line%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1 4-10z'%3E%3C/path%3E%3C/svg%3E";

  root.COOLDOWN_FREQS = ["everyVisit", "every10min", "oncePerDay"];

  root.QUOTES = [
    '"Future you is watching. Make them proud."',
    '"Discipline is choosing between what you want now and what you want most."',
    '"Deep work beats busy work."',
    '"Small steps every day build big results."',
    '"You don\'t need more time. You need more focus."',
    '"What you do today matters more than you think."',
    '"The obstacle is the way."',
    '"Suffer the pain of discipline or suffer the pain of regret."',
    '"Your focus determines your reality."',
    '"Be so good they cannot ignore you."',
    '"Discipline equals freedom."'
  ];
  root.getEffectiveCat = function (domainStr, customCats, hiddenSites) {
    const cats = customCats || root.siteCategories || root.siteCats || (typeof siteCategories !== "undefined" ? siteCategories : (typeof siteCats !== "undefined" ? siteCats : {}));
    const hidden = hiddenSites || root.hiddenDefaultSites || (typeof hiddenDefaultSites !== "undefined" ? hiddenDefaultSites : []);
    const auto = root.AUTO_CATEGORIES || {};

    if (cats[domainStr]) return { cat: cats[domainStr], auto: false };
    
    const parts = domainStr.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
        const sub = parts.slice(i).join(".");
        if (cats[sub]) return { cat: cats[sub], auto: false };
    }

    if (hidden.includes(domainStr)) return { cat: "uncategorized", auto: false };
    for (let i = 1; i < parts.length - 1; i++) {
        const sub = parts.slice(i).join(".");
        if (hidden.includes(sub)) return { cat: "uncategorized", auto: false };
    }

    if (auto[domainStr]) return { cat: auto[domainStr], auto: true };
    const subAuto = parts.length > 2 ? parts.slice(1).join(".") : domainStr;
    if (auto[subAuto]) return { cat: auto[subAuto], auto: true };

    return { cat: "uncategorized", auto: false };
  };
})(typeof self !== "undefined" ? self : this);
