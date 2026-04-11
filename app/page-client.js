"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePageClient = HomePageClient;
var react_1 = require("react");
var image_1 = require("next/image");
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var button_1 = require("@/components/ui/button");
var accordion_1 = require("@/components/ui/accordion");
var lucide_react_1 = require("lucide-react");
var header_1 = require("@/components/header");
var footer_1 = require("@/components/footer");
var error_boundary_1 = require("@/components/error-boundary");
var default_content_1 = require("@/lib/default-content");
var site_variant_1 = require("@/lib/site-variant");
var team_display_1 = require("@/lib/team-display");
var matches_1 = require("@/lib/matches");
var match_timeline_1 = require("@/lib/match-timeline");
var match_card_utils_1 = require("@/lib/match-card-utils");
var use_match_data_1 = require("@/lib/use-match-data");
var instagram_feed_1 = require("@/components/instagram-feed");
var match_feed_modal_1 = require("@/components/match-feed-modal");
var shop_status_provider_1 = require("@/components/shop-status-provider");
var use_final4_data_1 = require("@/lib/use-final4-data");
var final4_utils_1 = require("@/lib/final4-utils");
var TICKET_URL = "https://clubs.clubmate.se/harnosandshf/overview/";
var API_BASE_URL = (typeof process !== "undefined" && ((_a = process.env.NEXT_PUBLIC_MATCH_API_BASE) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, ""))) ||
    "https://api.harnosandshf.se";
var getInitialVariant = function () {
    // Always return a stable default for SSR — client resolves on mount via useEffect
    return "production";
};
var mapTimelineEvent = function (event) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    return ({
        time: (_a = event === null || event === void 0 ? void 0 : event.time) !== null && _a !== void 0 ? _a : "",
        type: (_j = (_g = (_e = (_c = (_b = event === null || event === void 0 ? void 0 : event.type) !== null && _b !== void 0 ? _b : event === null || event === void 0 ? void 0 : event.eventType) !== null && _c !== void 0 ? _c : (_d = event === null || event === void 0 ? void 0 : event.payload) === null || _d === void 0 ? void 0 : _d.type) !== null && _e !== void 0 ? _e : (_f = event === null || event === void 0 ? void 0 : event.payload) === null || _f === void 0 ? void 0 : _f.eventType) !== null && _g !== void 0 ? _g : (_h = event === null || event === void 0 ? void 0 : event.payload) === null || _h === void 0 ? void 0 : _h.eventTypeName) !== null && _j !== void 0 ? _j : "Händelse",
        team: (_k = event === null || event === void 0 ? void 0 : event.team) !== null && _k !== void 0 ? _k : (_l = event === null || event === void 0 ? void 0 : event.payload) === null || _l === void 0 ? void 0 : _l.team,
        player: (_m = event === null || event === void 0 ? void 0 : event.player) !== null && _m !== void 0 ? _m : (_o = event === null || event === void 0 ? void 0 : event.payload) === null || _o === void 0 ? void 0 : _o.player,
        playerNumber: (_p = event === null || event === void 0 ? void 0 : event.playerNumber) !== null && _p !== void 0 ? _p : (_q = event === null || event === void 0 ? void 0 : event.payload) === null || _q === void 0 ? void 0 : _q.playerNumber,
        description: ((_s = (_r = event === null || event === void 0 ? void 0 : event.payload) === null || _r === void 0 ? void 0 : _r.description) === null || _s === void 0 ? void 0 : _s.toString().trim()) ||
            ((_t = event === null || event === void 0 ? void 0 : event.description) === null || _t === void 0 ? void 0 : _t.toString().trim()) ||
            ((_v = (_u = event === null || event === void 0 ? void 0 : event.payload) === null || _u === void 0 ? void 0 : _u.eventText) === null || _v === void 0 ? void 0 : _v.toString().trim()) ||
            ((_w = event === null || event === void 0 ? void 0 : event.type) === null || _w === void 0 ? void 0 : _w.toString().trim()) ||
            "Händelse",
        homeScore: typeof (event === null || event === void 0 ? void 0 : event.homeScore) === "number" ? event.homeScore : undefined,
        awayScore: typeof (event === null || event === void 0 ? void 0 : event.awayScore) === "number" ? event.awayScore : undefined,
        period: typeof (event === null || event === void 0 ? void 0 : event.period) === "number" ? event.period : undefined,
        score: event === null || event === void 0 ? void 0 : event.score,
        eventId: (_x = event === null || event === void 0 ? void 0 : event.eventId) !== null && _x !== void 0 ? _x : event === null || event === void 0 ? void 0 : event.eventIndex,
        eventTypeId: typeof (event === null || event === void 0 ? void 0 : event.eventTypeId) === "number" ? event.eventTypeId : undefined,
        payload: event === null || event === void 0 ? void 0 : event.payload,
    });
};
var extractTopScorers = function (payload) {
    var _a, _b, _c, _d;
    var source = (_c = (_b = (_a = payload === null || payload === void 0 ? void 0 : payload.match) === null || _a === void 0 ? void 0 : _a.playerStats) === null || _b === void 0 ? void 0 : _b.topScorers) !== null && _c !== void 0 ? _c : (_d = payload === null || payload === void 0 ? void 0 : payload.playerStats) === null || _d === void 0 ? void 0 : _d.topScorers;
    if (!Array.isArray(source)) {
        return [];
    }
    return source
        .filter(function (scorer) { return (scorer === null || scorer === void 0 ? void 0 : scorer.name) && Number.isFinite(Number(scorer === null || scorer === void 0 ? void 0 : scorer.goals)); })
        .map(function (scorer) {
        var _a, _b;
        return ({
            team: (_b = (_a = scorer === null || scorer === void 0 ? void 0 : scorer.teamName) !== null && _a !== void 0 ? _a : scorer === null || scorer === void 0 ? void 0 : scorer.team) !== null && _b !== void 0 ? _b : "Okänt lag",
            player: String(scorer === null || scorer === void 0 ? void 0 : scorer.name),
            playerNumber: (scorer === null || scorer === void 0 ? void 0 : scorer.number) ? String(scorer.number) : undefined,
            goals: Number(scorer === null || scorer === void 0 ? void 0 : scorer.goals) || 0,
        });
    });
};
var dedupeTimelineEvents = function (events) {
    var seen = new Set();
    return events.filter(function (event) {
        var _a, _b;
        var key = event.eventId !== undefined
            ? "id:".concat(event.eventId)
            : "".concat(event.time, "|").concat(event.type, "|").concat(event.description, "|").concat((_a = event.homeScore) !== null && _a !== void 0 ? _a : "", "-").concat((_b = event.awayScore) !== null && _b !== void 0 ? _b : "");
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
// Add type import for EnhancedMatchData if not already present or use any
var isZeroScore = function (score) { return /^0\s*[-–—]\s*0$/.test(score.trim()); };
function final4ToNormalized(m) {
    var _a, _b;
    var isTBD = function (n) { return n.startsWith("Winner ") || n.startsWith("Loser ") || n === "TBD"; };
    var derivedStatus = (0, final4_utils_1.getFinal4DerivedStatus)(m);
    var displayScore = (0, final4_utils_1.getFinal4DisplayScore)(m);
    var venueLabel = (0, final4_utils_1.getFinal4VenueLabel)(m.venue);
    return {
        id: String(m.matchId),
        apiMatchId: String(m.matchId),
        homeTeam: m.homeName,
        awayTeam: m.awayName,
        opponent: "".concat(m.awayName, " (").concat(m.category, " ").concat(m.round, ")"),
        normalizedTeam: m.homeName,
        date: new Date(m.date),
        displayDate: new Date(m.date).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Stockholm" }),
        time: m.time || undefined,
        venue: venueLabel,
        series: m.categoryLabel || m.series || undefined,
        result: displayScore || undefined,
        playUrl: m.playUrl || undefined,
        infoUrl: m.detailUrl || undefined,
        teamType: m.category,
        matchStatus: derivedStatus,
        matchFeed: [],
        provider: "profixio",
        hasStream: Boolean(m.playUrl),
        statusLabel: derivedStatus === "live" ? "LIVE" : derivedStatus === "finished" ? "SLUT" : "KOMMANDE",
        resultState: displayScore ? "available" : derivedStatus === "upcoming" ? "not_started" : "pending",
        homeScore: displayScore ? (_a = m.homeScore) !== null && _a !== void 0 ? _a : undefined : undefined,
        awayScore: displayScore ? (_b = m.awayScore) !== null && _b !== void 0 ? _b : undefined : undefined,
        timelineAvailable: (0, final4_utils_1.isFinal4TimelineAvailable)(m) && !isTBD(m.homeName),
    };
}
function Final4MatchSection(_a) {
    var openMatchModal = _a.openMatchModal, fetchMatchTimeline = _a.fetchMatchTimeline, final4InitialData = _a.final4InitialData;
    var _b = (0, use_final4_data_1.useFinal4Data)(final4InitialData), data = _b.data, loading = _b.loading, error = _b.error;
    var normalizedMatches = (0, react_1.useMemo)(function () {
        if (!data)
            return [];
        return data.matches.map(final4ToNormalized);
    }, [data]);
    var liveMatches = normalizedMatches.filter(function (m) { return m.matchStatus === "live"; });
    var matchesByDate = (0, react_1.useMemo)(function () {
        var map = new Map();
        for (var _i = 0, normalizedMatches_1 = normalizedMatches; _i < normalizedMatches_1.length; _i++) {
            var m = normalizedMatches_1[_i];
            if (m.matchStatus === "live")
                continue;
            var dateKey = m.date.toISOString().slice(0, 10);
            if (!map.has(dateKey))
                map.set(dateKey, []);
            map.get(dateKey).push(m);
        }
        for (var _a = 0, _b = map.values(); _a < _b.length; _a++) {
            var matches = _b[_a];
            matches.sort(function (a, b) { return (a.time || "").localeCompare(b.time || ""); });
        }
        return Array.from(map.entries()).sort(function (_a, _b) {
            var a = _a[0];
            var b = _b[0];
            return a.localeCompare(b);
        });
    }, [normalizedMatches]);
    var formatDateHeading = function (dateStr) {
        var date = new Date(dateStr);
        return date.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
    };
    var renderRow = function (match) {
        var canOpen = match.timelineAvailable;
        var isLive = match.matchStatus === "live";
        var isFinished = match.matchStatus === "finished";
        var scoreValue = match.result || null;
        var rawCategory = match.teamType || "";
        var rawSeries = match.series || "";
        // Extract round from opponent field
        var roundMatch = match.opponent.match(/\((.*?)\)/);
        var roundInfo = roundMatch ? roundMatch[1] : "";
        var statusBadge = (function () {
            if (isLive)
                return { label: "LIVE", tone: "bg-slate-900 text-white" };
            if (isFinished)
                return { label: "SLUT", tone: "bg-slate-100 text-slate-500" };
            return { label: "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" };
        })();
        return (<li key={match.id}>
        <article className={"flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ".concat(canOpen ? "cursor-pointer hover:bg-slate-50" : "")} onMouseEnter={function () { if (canOpen)
            fetchMatchTimeline(match).catch(function () { return undefined; }); }} onClick={function (event) {
                if (!canOpen)
                    return;
                if (event.target.closest("a,button"))
                    return;
                openMatchModal(match);
            }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={"inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ".concat(statusBadge.tone)}>
              {statusBadge.label}
            </span>
            <span className="text-[11px] font-medium text-slate-400">{rawCategory}</span>
            {roundInfo && <span className="text-[11px] text-slate-300">{roundInfo}</span>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">
                {match.homeTeam} vs {match.awayTeam}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 break-words">
                {match.displayDate}{match.time ? " \u2022 ".concat(match.time) : ""}{match.venue ? " \u2022 ".concat(match.venue) : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:w-auto">
              {scoreValue && (<span className={"text-lg font-black tabular-nums ".concat(isLive ? "text-red-600" : "text-slate-900")} data-score-value="true">
                  {scoreValue}
                </span>)}
              {canOpen && (<span className="text-xs font-medium text-green-700">Detaljer</span>)}
            </div>
          </div>
        </article>
      </li>);
    };
    return (<section className="pt-10 pb-14 sm:pt-14 sm:pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (<div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent"/>
            </div>) : error ? (<p className="py-6 text-center text-sm text-slate-400">Matcherna kunde inte läsas in just nu.</p>) : normalizedMatches.length > 0 ? (<div>
              {liveMatches.length > 0 && (<div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
                      Live
                    </span>
                    <div className="flex-1 h-px bg-slate-200"/>
                  </div>
                  <ul>{liveMatches.map(renderRow)}</ul>
                </div>)}
              {matchesByDate.map(function (_a) {
                var dateKey = _a[0], matches = _a[1];
                return (<div key={dateKey} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900 capitalize">
                      {formatDateHeading(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-slate-200"/>
                  </div>
                  <ul>{matches.map(renderRow)}</ul>
                </div>);
            })}
            </div>) : (<p className="py-10 text-center text-sm text-slate-400">Matchprogrammet publiceras inom kort.</p>)}
        </div>
      </div>
    </section>);
}
function HomePageClient(_a) {
    var _this = this;
    var _b, _c, _d;
    var initialData = _a.initialData, _e = _a.isFinal4, isFinal4 = _e === void 0 ? false : _e, final4InitialData = _a.final4InitialData;
    var searchParams = (0, navigation_1.useSearchParams)();
    var isEditorMode = (searchParams === null || searchParams === void 0 ? void 0 : searchParams.get("editor")) === "true";
    var content = (0, react_1.useState)(default_content_1.defaultContent)[0];
    var _f = (0, react_1.useState)(getInitialVariant), siteVariant = _f[0], setSiteVariant = _f[1];
    var _g = (0, react_1.useState)("orange"), themeVariant = _g[0], setThemeVariant = _g[1];
    var _h = (0, react_1.useState)(true), showHeroContent = _h[0], setShowHeroContent = _h[1];
    var _j = (0, react_1.useState)(null), selectedMatchId = _j[0], setSelectedMatchId = _j[1];
    var _k = (0, react_1.useState)(null), selectedMatchSnapshot = _k[0], setSelectedMatchSnapshot = _k[1];
    var _l = (0, react_1.useState)({}), timelineByMatchId = _l[0], setTimelineByMatchId = _l[1];
    var _m = (0, react_1.useState)({}), topScorersByMatchId = _m[0], setTopScorersByMatchId = _m[1];
    var _o = (0, react_1.useState)({}), clockStateByMatchId = _o[0], setClockStateByMatchId = _o[1];
    var _p = (0, react_1.useState)({}), penaltiesByMatchId = _p[0], setPenaltiesByMatchId = _p[1];
    var _q = (0, react_1.useState)({}), stableScoreByMatchId = _q[0], setStableScoreByMatchId = _q[1];
    var timelineFetchInFlightRef = (0, react_1.useRef)({});
    var timelineFetchedAtRef = (0, react_1.useRef)({});
    var shopVisible = (0, shop_status_provider_1.useShopStatus)().shopVisible;
    var _r = (0, use_match_data_1.useMatchData)({
        dataType: "liveUpcoming",
        initialData: initialData,
        followInitialWindow: true,
    }), currentMatches = _r.matches, recentResults = _r.recentResults, groupedFeed = _r.groupedFeed, matchLoading = _r.loading, matchErrorMessage = _r.error, hasMatchPayload = _r.hasPayload, hasClientMatchData = _r.hasClientData, refreshHomeMatches = _r.refresh, matchRefreshing = _r.isRefreshing;
    var matchError = Boolean(matchErrorMessage);
    var hasTriggeredFallbackRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(function () {
        var matches = __spreadArray(__spreadArray([], currentMatches, true), recentResults, true);
        if (matches.length === 0)
            return;
        setStableScoreByMatchId(function (prev) {
            var changed = false;
            var next = __assign({}, prev);
            for (var _i = 0, matches_2 = matches; _i < matches_2.length; _i++) {
                var match = matches_2[_i];
                var cleaned = typeof match.result === "string" ? match.result.trim() : "";
                if (cleaned && cleaned.toLowerCase() !== "inte publicerat" && next[match.id] !== cleaned) {
                    next[match.id] = cleaned;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [currentMatches, recentResults]);
    // If SSR returned empty data, trigger one client-side fetch as fallback
    (0, react_1.useEffect)(function () {
        var _a, _b, _c, _d;
        if (hasTriggeredFallbackRef.current)
            return;
        if (hasMatchPayload && !matchLoading) {
            // Data arrived (from SSR or initial direct fetch) — check if empty
            var total = ((_b = (_a = groupedFeed === null || groupedFeed === void 0 ? void 0 : groupedFeed.live) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = groupedFeed === null || groupedFeed === void 0 ? void 0 : groupedFeed.upcoming) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) + recentResults.length;
            if (total === 0) {
                hasTriggeredFallbackRef.current = true;
                refreshHomeMatches(true).catch(function () { });
            }
            else {
                hasTriggeredFallbackRef.current = true;
            }
        }
    }, [hasMatchPayload, matchLoading, groupedFeed, recentResults, refreshHomeMatches]);
    // Track previous scores to highlight live updates
    var partnersForDisplay = Array.isArray(content.partners) ? content.partners.filter(function (p) { return p.visibleInCarousel; }) : [];
    var grannstadenPartner = {
        id: "grannstaden",
        src: "/grannstaden.svg",
        alt: "Grannstaden",
        tier: "Platinapartner",
        visibleInCarousel: true,
        linkUrl: "https://grannstaden.se/",
        benefits: [],
    };
    var allPartnersForDisplay = __spreadArray(__spreadArray([], partnersForDisplay, true), [grannstadenPartner], false);
    var partnersByTier = allPartnersForDisplay.reduce(function (acc, partner) {
        if (!acc[partner.tier]) {
            acc[partner.tier] = [];
        }
        acc[partner.tier].push(partner);
        return acc;
    }, {});
    var tierOrder = ["Diamantpartner", "Platinapartner", "Guldpartner", "Silverpartner", "Bronspartner"];
    function getMatchStatus(match) {
        return (0, match_card_utils_1.getSimplifiedMatchStatus)(match);
    }
    var allHomeMatches = (0, react_1.useMemo)(function () {
        var seenIds = new Set();
        return __spreadArray(__spreadArray([], currentMatches, true), recentResults, true).filter(function (match) {
            if (seenIds.has(match.id)) {
                return false;
            }
            seenIds.add(match.id);
            return true;
        });
    }, [currentMatches, recentResults]);
    var selectedMatch = (0, react_1.useMemo)(function () { var _a; return (_a = allHomeMatches.find(function (match) { return match.id === selectedMatchId; })) !== null && _a !== void 0 ? _a : ((selectedMatchSnapshot === null || selectedMatchSnapshot === void 0 ? void 0 : selectedMatchSnapshot.id) === selectedMatchId ? selectedMatchSnapshot : null); }, [allHomeMatches, selectedMatchId, selectedMatchSnapshot]);
    var fetchMatchTimeline = (0, react_1.useCallback)(function (match_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([match_1], args_1, true), void 0, function (match, force) {
            var lastFetchedAt, shouldRefresh, inFlight, apiMatchId, request;
            var _this = this;
            var _a;
            if (force === void 0) { force = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        lastFetchedAt = (_a = timelineFetchedAtRef.current[match.id]) !== null && _a !== void 0 ? _a : 0;
                        shouldRefresh = force || match.matchStatus === "live" || Date.now() - lastFetchedAt > 5000;
                        if (!shouldRefresh && Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
                            return [2 /*return*/];
                        }
                        inFlight = timelineFetchInFlightRef.current[match.id];
                        if (inFlight) {
                            return [2 /*return*/, inFlight];
                        }
                        apiMatchId = match.apiMatchId;
                        if (!apiMatchId) {
                            return [2 /*return*/];
                        }
                        request = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var fetchTimelinePayload, isFinal4Match, payload, rawTimeline, final4Payload, normalized, topScorers;
                            var _this = this;
                            var _a, _b, _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        fetchTimelinePayload = function (url) { return __awaiter(_this, void 0, void 0, function () {
                                            var response;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, fetch(url, {
                                                            cache: "no-store",
                                                            headers: { Accept: "application/json" },
                                                        })];
                                                    case 1:
                                                        response = _a.sent();
                                                        if (!response.ok) {
                                                            return [2 /*return*/, null];
                                                        }
                                                        return [2 /*return*/, response.json()];
                                                }
                                            });
                                        }); };
                                        isFinal4Match = (_b = (_a = match.infoUrl) === null || _a === void 0 ? void 0 : _a.includes("/leagueid27943/")) !== null && _b !== void 0 ? _b : false;
                                        return [4 /*yield*/, fetchTimelinePayload("".concat(API_BASE_URL, "/matcher/match/").concat(encodeURIComponent(apiMatchId), "?includeEvents=1"))];
                                    case 1:
                                        payload = _e.sent();
                                        rawTimeline = (0, match_timeline_1.resolvePreferredTimeline)(payload !== null && payload !== void 0 ? payload : {}, (_c = match.matchFeed) !== null && _c !== void 0 ? _c : []);
                                        if (!(isFinal4Match && (!(payload === null || payload === void 0 ? void 0 : payload.match) || rawTimeline.length === 0))) return [3 /*break*/, 3];
                                        return [4 /*yield*/, fetchTimelinePayload("".concat(API_BASE_URL, "/matcher/final4/match/").concat(encodeURIComponent(apiMatchId)))];
                                    case 2:
                                        final4Payload = _e.sent();
                                        if (final4Payload) {
                                            payload = final4Payload;
                                            rawTimeline = (0, match_timeline_1.resolvePreferredTimeline)(final4Payload, (_d = match.matchFeed) !== null && _d !== void 0 ? _d : []);
                                        }
                                        _e.label = 3;
                                    case 3:
                                        if (!payload) {
                                            throw new Error("Could not load timeline");
                                        }
                                        normalized = dedupeTimelineEvents(rawTimeline.map(function (event) { return mapTimelineEvent(event); }));
                                        setTimelineByMatchId(function (prev) {
                                            var _a;
                                            return (__assign(__assign({}, prev), (_a = {}, _a[match.id] = normalized, _a)));
                                        });
                                        timelineFetchedAtRef.current[match.id] = Date.now();
                                        if (payload === null || payload === void 0 ? void 0 : payload.clockState) {
                                            setClockStateByMatchId(function (prev) {
                                                var _a;
                                                return (__assign(__assign({}, prev), (_a = {}, _a[match.id] = payload.clockState, _a)));
                                            });
                                        }
                                        if (Array.isArray(payload === null || payload === void 0 ? void 0 : payload.penalties)) {
                                            setPenaltiesByMatchId(function (prev) {
                                                var _a;
                                                return (__assign(__assign({}, prev), (_a = {}, _a[match.id] = payload.penalties, _a)));
                                            });
                                        }
                                        topScorers = extractTopScorers(payload);
                                        if (topScorers.length > 0) {
                                            setTopScorersByMatchId(function (prev) {
                                                var _a;
                                                return (__assign(__assign({}, prev), (_a = {}, _a[match.id] = topScorers, _a)));
                                            });
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); })();
                        timelineFetchInFlightRef.current[match.id] = request;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, request];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        delete timelineFetchInFlightRef.current[match.id];
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }, [timelineByMatchId]);
    var openMatchModal = (0, react_1.useCallback)(function (match) {
        setSelectedMatchId(match.id);
        setSelectedMatchSnapshot(match);
        fetchMatchTimeline(match, true).catch(function (error) {
            console.warn("Failed to hydrate match timeline", error);
        });
    }, [fetchMatchTimeline]);
    var getMergedTimeline = (0, react_1.useCallback)(function (match) {
        var _a;
        var hydrated = timelineByMatchId[match.id];
        if (Object.prototype.hasOwnProperty.call(timelineByMatchId, match.id)) {
            return hydrated;
        }
        return dedupeTimelineEvents(((_a = match.matchFeed) !== null && _a !== void 0 ? _a : []).map(function (event) { return mapTimelineEvent(event); }));
    }, [timelineByMatchId]);
    (0, react_1.useEffect)(function () {
        if (!selectedMatch)
            return;
        if (selectedMatch.matchStatus !== "live")
            return;
        var interval = window.setInterval(function () {
            fetchMatchTimeline(selectedMatch, true).catch(function () { return undefined; });
        }, 3000);
        return function () { return window.clearInterval(interval); };
    }, [selectedMatch, fetchMatchTimeline]);
    var renderHomeMatchCard = function (match) {
        var _a, _b, _c, _d;
        var status = getMatchStatus(match);
        var canOpenTimeline = (0, match_card_utils_1.canOpenMatchTimeline)(match);
        var scheduleLabel = (0, match_card_utils_1.buildMatchScheduleLabel)(match);
        var matchupLabel = (0, match_card_utils_1.getMatchupLabel)(match);
        var showProfixioWarning = (0, match_card_utils_1.shouldShowProfixioTechnicalIssue)(match);
        var showFinishedZeroZeroIssue = (0, match_card_utils_1.shouldShowFinishedZeroZeroIssue)(match);
        var teamTypeRaw = ((_a = match.teamType) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        var teamTypeLabel = (0, team_display_1.extendTeamDisplayName)(teamTypeRaw) || teamTypeRaw || "Härnösands HF";
        var liveScore = typeof match.result === "string" ? match.result.trim() : "";
        var stableScore = liveScore || stableScoreByMatchId[match.id] || "";
        var hasStarted = match.date.getTime() <= Date.now() + 60000;
        // Suppress stale SSR 0-0 for live matches until first client poll confirms the score
        var isUnconfirmedZero = !hasClientMatchData && status === "live" && isZeroScore(stableScore);
        var scoreValue = stableScore && !isUnconfirmedZero && (status !== "upcoming" || hasStarted) ? stableScore : null;
        var showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero) && !scoreValue;
        var hasStream = match.hasStream === true &&
            Boolean(((_b = match.playUrl) !== null && _b !== void 0 ? _b : "").trim()) &&
            ((_c = match.playUrl) !== null && _c !== void 0 ? _c : "").trim().toLowerCase() !== "null";
        var statusBadge = (function () {
            var _a, _b, _c;
            if (status === "live") {
                return { label: (_a = match.statusLabel) !== null && _a !== void 0 ? _a : "LIVE", tone: "bg-slate-900 text-white" };
            }
            if (status === "finished") {
                return { label: (_b = match.statusLabel) !== null && _b !== void 0 ? _b : "SLUT", tone: "bg-slate-100 text-slate-500" };
            }
            return { label: (_c = match.statusLabel) !== null && _c !== void 0 ? _c : "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" };
        })();
        return (<li key={match.id}>
        <article id={"match-card-".concat(match.id)} className={"group relative flex flex-col gap-3 border-b border-slate-200 px-0 py-4 transition ".concat(canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : "")} onMouseEnter={function () {
                if (canOpenTimeline) {
                    fetchMatchTimeline(match).catch(function () { return undefined; });
                }
            }} onTouchStart={function () {
                if (canOpenTimeline) {
                    fetchMatchTimeline(match).catch(function () { return undefined; });
                }
            }} onClick={function (event) {
                if (!canOpenTimeline) {
                    return;
                }
                var target = event.target;
                if (target.closest("a,button")) {
                    return;
                }
                openMatchModal(match);
            }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{teamTypeLabel}</p>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold leading-tight text-slate-950 sm:text-[15px]">
                {matchupLabel}
              </h3>
              {scheduleLabel && <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{scheduleLabel}</p>}
            </div>
            <span className={"inline-flex w-fit items-center justify-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ".concat(statusBadge.tone)}>
              {statusBadge.label}
            </span>
          </div>

          {scoreValue && (<div className="py-2" data-score-value="true">
              <span className={"text-3xl font-black tabular-nums tracking-tight ".concat(status === "live" ? "text-slate-900" : "text-slate-900")}>
                {scoreValue}
              </span>
            </div>)}

          {showLivePendingScore && (<p className="text-xs text-slate-400">Livescore väntar</p>)}

          {match.series && (<p className="text-[11px] text-slate-400">{match.series}</p>)}
        {showProfixioWarning && (<p className="border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Liveuppdateringen har tekniska problem just nu.
          </p>)}
        {showFinishedZeroZeroIssue && (<p className="border-l-2 border-amber-400 pl-3 text-xs text-amber-700">
            Misstänkt resultatfel: avslutad match visas som 0–0.
          </p>)}
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-400">{status === "upcoming" ? "Fler detaljer på matchsidan" : "Öppna för detaljer"}</span>
            {hasStream ? (<a href={((_d = match.playUrl) !== null && _d !== void 0 ? _d : "").trim()} target="_blank" rel="noreferrer" onClick={function (event) { return event.stopPropagation(); }} className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline">
                {(0, match_card_utils_1.getMatchWatchLabel)(status)}
              </a>) : canOpenTimeline ? (<button type="button" onClick={function (event) {
                    event.stopPropagation();
                    openMatchModal(match);
                }} className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline">
                Detaljer
              </button>) : (<link_1.default href="/matcher" onClick={function (event) { return event.stopPropagation(); }} className="text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline">
                Till matcher
              </link_1.default>)}
          </div>
      </article>
      </li>);
    };
    var renderUpcomingPreviewRow = function (match) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var canOpenTimeline = (0, match_card_utils_1.canOpenMatchTimeline)(match);
        var scheduleLabel = (0, match_card_utils_1.buildMatchScheduleLabel)(match);
        var matchupLabel = (0, match_card_utils_1.getMatchupLabel)(match);
        var teamTypeRaw = ((_a = match.teamType) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        var teamTypeLabel = (0, team_display_1.extendTeamDisplayName)(teamTypeRaw) || teamTypeRaw || "Härnösands HF";
        var hasStream = match.hasStream === true && Boolean(((_b = match.playUrl) !== null && _b !== void 0 ? _b : "").trim()) && ((_c = match.playUrl) !== null && _c !== void 0 ? _c : "").trim().toLowerCase() !== "null";
        var dayLabel = ((_e = (_d = match.display) === null || _d === void 0 ? void 0 : _d.dateCard) === null || _e === void 0 ? void 0 : _e.trim()) || match.displayDate;
        var timeLabel = ((_g = (_f = match.display) === null || _f === void 0 ? void 0 : _f.time) === null || _g === void 0 ? void 0 : _g.trim()) || ((_h = match.time) === null || _h === void 0 ? void 0 : _h.trim()) || "";
        return (<li key={match.id}>
        <article className={"flex flex-col gap-2 border-b border-slate-200 py-3.5 transition ".concat(canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : "")} onClick={function (event) {
                if (!canOpenTimeline) {
                    return;
                }
                var target = event.target;
                if (target.closest("a,button")) {
                    return;
                }
                openMatchModal(match);
            }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              {dayLabel}
            </span>
            {timeLabel ? (<span className="text-[11px] text-slate-300">{timeLabel}</span>) : null}
            <span className="text-[11px] font-medium text-slate-400">{teamTypeLabel}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 break-words">{matchupLabel}</p>
            </div>

            {hasStream ? (<a href={((_j = match.playUrl) !== null && _j !== void 0 ? _j : "").trim()} target="_blank" rel="noreferrer" onClick={function (event) { return event.stopPropagation(); }} className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline shrink-0">
                {(0, match_card_utils_1.getMatchWatchLabel)("upcoming")}
              </a>) : null}
          </div>
        </article>
      </li>);
    };
    var renderHomeFlowRow = function (match) {
        var _a, _b, _c, _d;
        var status = getMatchStatus(match);
        var canOpenTimeline = (0, match_card_utils_1.canOpenMatchTimeline)(match);
        var scheduleLabel = (0, match_card_utils_1.buildMatchScheduleLabel)(match);
        var matchupLabel = (0, match_card_utils_1.getMatchupLabel)(match);
        var teamTypeRaw = ((_a = match.teamType) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        var teamTypeLabel = (0, team_display_1.extendTeamDisplayName)(teamTypeRaw) || teamTypeRaw || "Härnösands HF";
        var hasStream = match.hasStream === true && Boolean(((_b = match.playUrl) !== null && _b !== void 0 ? _b : "").trim()) && ((_c = match.playUrl) !== null && _c !== void 0 ? _c : "").trim().toLowerCase() !== "null";
        var liveScore = typeof match.result === "string" ? match.result.trim() : "";
        var stableScore = liveScore || stableScoreByMatchId[match.id] || "";
        var hasStarted = match.date.getTime() <= Date.now() + 60000;
        var isUnconfirmedZero = !hasClientMatchData && status === "live" && isZeroScore(stableScore);
        var scoreValue = stableScore && !isUnconfirmedZero && (status !== "upcoming" || hasStarted) ? stableScore : null;
        var showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero) && !scoreValue;
        var statusBadge = (function () {
            var _a, _b, _c;
            if (status === "live") {
                return { label: (_a = match.statusLabel) !== null && _a !== void 0 ? _a : "LIVE", tone: "bg-slate-900 text-white" };
            }
            if (status === "finished") {
                return { label: (_b = match.statusLabel) !== null && _b !== void 0 ? _b : "SLUT", tone: "bg-slate-100 text-slate-500" };
            }
            return { label: (_c = match.statusLabel) !== null && _c !== void 0 ? _c : "KOMMANDE", tone: "bg-white text-slate-500 border border-slate-200" };
        })();
        return (<li key={match.id}>
        <article className={"flex flex-col gap-3 border-b border-slate-200 px-0 py-3.5 transition ".concat(canOpenTimeline ? "cursor-pointer hover:bg-slate-50" : "")} onMouseEnter={function () {
                if (canOpenTimeline) {
                    fetchMatchTimeline(match).catch(function () { return undefined; });
                }
            }} onTouchStart={function () {
                if (canOpenTimeline) {
                    fetchMatchTimeline(match).catch(function () { return undefined; });
                }
            }} onClick={function (event) {
                if (!canOpenTimeline) {
                    return;
                }
                var target = event.target;
                if (target.closest("a,button")) {
                    return;
                }
                openMatchModal(match);
            }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={"inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ".concat(statusBadge.tone)}>
              {statusBadge.label}
            </span>
            <span className="text-[11px] font-medium text-slate-400">{teamTypeLabel}</span>
            {match.series ? <span className="text-[11px] text-slate-300">{match.series}</span> : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 break-words sm:text-[15px]">{matchupLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{scheduleLabel}</p>
              {showLivePendingScore ? (<p className="mt-1 text-xs text-slate-400">Livescore väntar</p>) : null}
            </div>

            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              {scoreValue ? (<span className="text-lg font-black tabular-nums text-slate-900" data-score-value="true">
                  {scoreValue}
                </span>) : null}
              {hasStream ? (<a href={((_d = match.playUrl) !== null && _d !== void 0 ? _d : "").trim()} target="_blank" rel="noreferrer" onClick={function (event) { return event.stopPropagation(); }} className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
                  {(0, match_card_utils_1.getMatchWatchLabel)(status)}
                </a>) : canOpenTimeline ? (<button type="button" onClick={function (event) {
                    event.stopPropagation();
                    openMatchModal(match);
                }} className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
                  Detaljer
                </button>) : null}
            </div>
          </div>
        </article>
      </li>);
    };
    var renderUpcomingSkeletonRows = function () { return (<div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map(function (_, index) { return (<div key={"upcoming-skeleton-".concat(index)} className="py-4">
          <div className="flex gap-2">
            <div className="h-4 w-14 bg-slate-100"/>
            <div className="h-4 w-10 bg-slate-50"/>
          </div>
          <div className="mt-2 h-4 w-3/5 bg-slate-100"/>
          <div className="mt-1.5 h-3 w-2/5 bg-slate-50"/>
        </div>); })}
    </div>); };
    var homeMatchFlow = (0, react_1.useMemo)(function () {
        var _a, _b, _c;
        var seen = new Set();
        var liveItems = ((_a = groupedFeed === null || groupedFeed === void 0 ? void 0 : groupedFeed.live) !== null && _a !== void 0 ? _a : []).slice(0, 5);
        // Use recentResults from API, but fall back to recently finished matches
        // from the grouped feed when the API returns no recent results (e.g. when
        // a match result hasn't been published yet).
        var now = Date.now();
        var SIX_HOURS = 6 * 60 * 60 * 1000;
        var finishedFallback = recentResults.length === 0
            ? ((_b = groupedFeed === null || groupedFeed === void 0 ? void 0 : groupedFeed.finished) !== null && _b !== void 0 ? _b : []).filter(function (m) {
                var ts = typeof m.startTimestamp === "number" ? m.startTimestamp : new Date(m.date).getTime();
                return Number.isFinite(ts) && now - ts < SIX_HOURS;
            }).slice(0, 3)
            : [];
        var resultItems = recentResults.length > 0 ? recentResults.slice(0, 3) : finishedFallback;
        var remainingSlots = Math.max(15 - liveItems.length - resultItems.length, 0);
        var upcomingItems = ((_c = groupedFeed === null || groupedFeed === void 0 ? void 0 : groupedFeed.upcoming) !== null && _c !== void 0 ? _c : []).slice(0, remainingSlots);
        var ordered = __spreadArray(__spreadArray(__spreadArray([], liveItems, true), resultItems, true), upcomingItems, true).filter(function (match) {
            if (seen.has(match.id)) {
                return false;
            }
            seen.add(match.id);
            return true;
        });
        return {
            items: ordered.slice(0, 15),
            total: ordered.length,
        };
    }, [groupedFeed, recentResults]);
    var showInitialMatchLoader = !matchError && homeMatchFlow.items.length === 0 && (matchLoading || !hasMatchPayload);
    (0, react_1.useEffect)(function () {
        if (typeof window === "undefined") {
            return;
        }
        var resolved = (0, site_variant_1.deriveSiteVariant)(window.location.host);
        setSiteVariant(resolved);
        var resolvedTheme = (0, site_variant_1.getThemeVariant)(window.location.host);
        setThemeVariant(resolvedTheme);
    }, []);
    var isPinkTheme = themeVariant === "pink";
    var _s = (0, react_1.useState)(function () { return (0, site_variant_1.getHeroImages)(); }), heroImages = _s[0], setHeroImages = _s[1];
    (0, react_1.useEffect)(function () {
        if (typeof window !== "undefined") {
            setHeroImages((0, site_variant_1.getHeroImages)(window.location.host));
        }
    }, []);
    var heroOverlayClass = isPinkTheme
        ? "from-pink-900/40 via-pink-800/20 to-rose-900/60"
        : "from-black/70 via-black/40 to-transparent";
    return (<error_boundary_1.ErrorBoundary>
      <div>
        <header_1.Header />
        <main>
          {/* Hero Section */}
          {isFinal4 ? (<section className="relative w-full h-[70vh] sm:h-screen overflow-hidden">
              <image_1.default src="/final4-hero.webp" alt="Final4 Norr 2026" fill className="z-0 object-cover object-center" priority quality={90} sizes="100vw"/>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10"/>
            </section>) : (<section className={"relative w-full h-screen flex items-center justify-center overflow-hidden ".concat(isPinkTheme ? "bg-gradient-to-br from-pink-50 via-pink-100 to-rose-200" : "")}>
            {/* Mobile Image */}
            {isPinkTheme && (<image_1.default src={heroImages.mobile} alt="Härnösands HF Memorial - Laget Före Allt" fill quality={75} priority={true} className="z-0 object-cover block sm:hidden will-change-auto" sizes="100vw" style={{
                    objectPosition: 'center center'
                }} onLoad={function () {
                    if (!showHeroContent) {
                        setTimeout(function () { return setShowHeroContent(true); }, 1000);
                    }
                }} onError={function (e) {
                    console.error('Mobile hero image failed to load:', heroImages.mobile);
                }}/>)}

            {/* Desktop Image */}
            <image_1.default src={heroImages.desktop} alt={isPinkTheme ? "Härnösands HF Memorial - Laget Före Allt" : "Härnösands HF herrlag och damlag 2025"} fill quality={75} priority={true} className={"z-0 object-cover ".concat(isPinkTheme ? "hidden sm:block" : "block")} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw" style={{
                objectPosition: 'center center'
            }} onLoad={function () {
                if (isPinkTheme && !showHeroContent) {
                    setTimeout(function () { return setShowHeroContent(true); }, 1000);
                }
            }} onError={function (e) {
                console.error('Hero image failed to load:', heroImages.desktop);
                if (isPinkTheme) {
                    // Force reload attempt
                    var img_1 = e.target;
                    setTimeout(function () {
                        img_1.src = heroImages.desktop + '?v=' + Date.now();
                    }, 1000);
                }
            }} {...(isEditorMode && {
            "data-editable": "true",
            "data-field-path": "home.hero.imageUrl",
        })}/>
            <div className={"absolute inset-0 bg-gradient-to-t ".concat(heroOverlayClass, " z-10 ").concat(isPinkTheme ? "" : "")}/>
            {isPinkTheme && (<>
                <div className="absolute inset-0 z-5 bg-gradient-to-br from-pink-500/8 via-rose-400/5 to-pink-900/15 pointer-events-none"/>
                <div className="absolute inset-0 z-6 pointer-events-none" style={{
                    background: 'radial-gradient(circle at center, transparent 20%, rgba(236,72,153,0.05) 50%, rgba(190,24,93,0.12) 100%)'
                }}/>
              </>)}
            <div className={"relative z-20 text-white text-center px-4 sm:px-6 md:px-8 max-w-5xl mx-auto transition-opacity duration-700 w-full h-full flex flex-col justify-center items-center ".concat(showHeroContent ? "opacity-100" : "opacity-0")}>
              <h1 className={"text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight text-shadow-outline"} {...(isEditorMode && {
            "data-editable": "true",
            "data-field-path": "home.hero.title",
        })}>
                {isPinkTheme ? (<>LAGET <span className="text-pink-300 drop-shadow-[0_0_30px_rgba(244,114,182,0.8)] animate-pulse">FÖRE ALLT</span></>) : (<>LAGET <span className="text-orange-500">FÖRE ALLT</span></>)}
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl sm:max-w-3xl mx-auto animate-fade-in-up delay-200 text-shadow-md px-4 sm:px-2 md:px-0 leading-relaxed" {...(isEditorMode && {
            "data-editable": "true",
            "data-field-path": "home.hero.description",
        })}>
                {content.hero.description}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 animate-fade-in-up delay-400 mb-8 sm:mb-12 px-2 sm:px-0">
                <button_1.Button asChild className={"".concat(isPinkTheme
                ? "bg-pink-500 hover:bg-pink-600 focus:ring-pink-300 shadow-pink-500/25"
                : "bg-orange-500 hover:bg-orange-600 focus:ring-orange-300", " text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto")}>
                  <link_1.default href={content.hero.button1Link}>
                    <span {...(isEditorMode && {
            "data-editable": "true",
            "data-field-path": "home.hero.button1Text",
        })}>
                      {content.hero.button1Text}
                    </span>
                    <lucide_react_1.ArrowRight className="ml-3 h-5 w-5"/>
                  </link_1.default>
                </button_1.Button>
                <button_1.Button asChild className={"".concat(isPinkTheme
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300 shadow-emerald-500/25"
                : "bg-green-700 hover:bg-green-800 focus:ring-green-300", " text-white px-6 sm:px-10 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 w-full sm:w-auto")}>
                  <link_1.default href={content.hero.button2Link}>
                    <span {...(isEditorMode && {
            "data-editable": "true",
            "data-field-path": "home.hero.button2Text",
        })}>
                      {content.hero.button2Text}
                    </span>
                  </link_1.default>
                </button_1.Button>
              </div>

              <div className="flex justify-center space-x-6 animate-fade-in-up delay-600">
                <link_1.default href="https://www.facebook.com/profile.php?id=61566621756014" target="_blank" rel="noopener noreferrer" aria-label="Följ oss på Facebook" className="group flex items-center space-x-2 bg-white/15 hover:bg-white/25 rounded-full px-4 py-2 transition-transform duration-300 hover:scale-105">
                  <lucide_react_1.Facebook className="w-5 h-5"/>
                  <span className="font-medium hidden sm:block">Facebook</span>
                </link_1.default>
                <link_1.default href="https://www.instagram.com/harnosandshf" target="_blank" rel="noopener noreferrer" aria-label="Följ oss på Instagram" className="group flex items-center space-x-2 bg-white/15 hover:bg-white/25 rounded-full px-4 py-2 transition-transform duration-300 hover:scale-105">
                  <lucide_react_1.Instagram className="w-5 h-5"/>
                  <span className="font-medium hidden sm:block">Instagram</span>
                </link_1.default>
              </div>
            </div>
          </section>)}

          {/* ===================== SHOP & QUICK ACTIONS HUB ===================== */}
          <section className="relative z-30 -mt-10 sm:-mt-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                {/* Shop hero banner */}
                <link_1.default href={shopVisible ? shop_status_provider_1.SHOP_URL : "/shop"} target={shopVisible ? "_blank" : undefined} rel={shopVisible ? "noopener noreferrer" : undefined} className="group block border border-slate-200 bg-white p-5 sm:p-6 mb-5 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Nytt i butiken</p>
                      <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        Mössor och supporterprylar
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Stöd klubben — handla direkt.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 border border-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 transition group-hover:bg-slate-900 group-hover:text-white shrink-0">
                      Öppna butiken
                      <lucide_react_1.ArrowRight className="h-3.5 w-3.5"/>
                    </span>
                  </div>
                </link_1.default>

                {/* Quick action cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 border border-slate-200 mb-10 sm:mb-14">
                  <link_1.default href="/matcher" aria-label="Matcher" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <lucide_react_1.Calendar className="h-4 w-4 text-slate-400 shrink-0"/>
                    <span className="text-sm font-medium text-slate-700">Matcher</span>
                  </link_1.default>
                  <link_1.default href={TICKET_URL} target="_blank" rel="noopener noreferrer" aria-label="Biljetter" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <lucide_react_1.Ticket className="h-4 w-4 text-slate-400 shrink-0"/>
                    <span className="text-sm font-medium text-slate-700">Biljetter</span>
                  </link_1.default>
                  <link_1.default href="/lag" aria-label="Lag" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <lucide_react_1.Users className="h-4 w-4 text-slate-400 shrink-0"/>
                    <span className="text-sm font-medium text-slate-700">Lag</span>
                  </link_1.default>
                  <link_1.default href={shopVisible ? shop_status_provider_1.SHOP_URL : "/shop"} target={shopVisible ? "_blank" : undefined} rel={shopVisible ? "noopener noreferrer" : undefined} aria-label="Butik" className="group flex items-center gap-3 bg-white p-4 transition hover:bg-slate-50">
                    <lucide_react_1.ShoppingBag className="h-4 w-4 text-slate-400 shrink-0"/>
                    <span className="text-sm font-medium text-slate-700">Butik</span>
                  </link_1.default>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== MATCHES ===================== */}
          {isFinal4 ? (<Final4MatchSection openMatchModal={openMatchModal} fetchMatchTimeline={fetchMatchTimeline} final4InitialData={final4InitialData}/>) : (<section className="pt-10 pb-14 sm:pt-14 sm:pb-16">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto">
                {showInitialMatchLoader ? (renderUpcomingSkeletonRows()) : matchError ? (<p className="py-6 text-center text-sm text-slate-400">
                    Matcherna kunde inte läsas in just nu.
                  </p>) : homeMatchFlow.items.length > 0 ? (<div className="space-y-6">
                    {/* Promoted A-lag ticket matches */}
                    {(function () {
                    var ticketMatches = homeMatchFlow.items.filter(function (m) { return getMatchStatus(m) !== "finished" && (0, matches_1.canShowTicketForMatch)(m); });
                    if (ticketMatches.length === 0)
                        return null;
                    return (<div className="space-y-3">
                          {ticketMatches.map(function (match) {
                            var _a, _b;
                            var status = getMatchStatus(match);
                            var canOpen = (0, match_card_utils_1.canOpenMatchTimeline)(match);
                            var scheduleLabel = (0, match_card_utils_1.buildMatchScheduleLabel)(match);
                            var matchupLabel = (0, match_card_utils_1.getMatchupLabel)(match);
                            var teamTypeRaw = ((_a = match.teamType) === null || _a === void 0 ? void 0 : _a.trim()) || "";
                            var teamTypeLabel = (0, team_display_1.extendTeamDisplayName)(teamTypeRaw) || teamTypeRaw || "Härnösands HF";
                            var liveScore = typeof match.result === "string" ? match.result.trim() : "";
                            var stableScore = liveScore || stableScoreByMatchId[match.id] || "";
                            var hasStarted = match.date.getTime() <= Date.now() + 60000;
                            var scoreValue = stableScore && (status !== "upcoming" || hasStarted) ? stableScore : null;
                            var isLive = status === "live";
                            return (<article key={"promoted-".concat(match.id)} className={"group relative border border-slate-900 bg-slate-950 p-5 sm:p-6 text-white transition ".concat(canOpen ? "cursor-pointer hover:bg-slate-900" : "")} onMouseEnter={function () { if (canOpen)
                                fetchMatchTimeline(match).catch(function () { return undefined; }); }} onClick={function (event) {
                                    if (!canOpen)
                                        return;
                                    if (event.target.closest("a,button"))
                                        return;
                                    openMatchModal(match);
                                }}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      {isLive ? (<span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-slate-900">
                                          LIVE
                                        </span>) : (<span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                                          {(_b = match.statusLabel) !== null && _b !== void 0 ? _b : "KOMMANDE"}
                                        </span>)}
                                      <span className="text-[11px] font-medium text-white/40">{teamTypeLabel}</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-bold leading-snug break-words">{matchupLabel}</h3>
                                    {scheduleLabel && <p className="mt-1 text-xs text-white/40 break-words">{scheduleLabel}</p>}
                                  </div>
                                  <div className="flex flex-col items-end gap-3 shrink-0">
                                    {scoreValue && (<span className="text-3xl font-black tabular-nums text-white" data-score-value="true">
                                        {scoreValue}
                                      </span>)}
                                    <link_1.default href={TICKET_URL} target="_blank" rel="noopener noreferrer" onClick={function (e) { return e.stopPropagation(); }} className="inline-flex items-center gap-1.5 border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-slate-900">
                                      <lucide_react_1.Ticket className="h-3.5 w-3.5"/>
                                      Köp biljett
                                    </link_1.default>
                                  </div>
                                </div>
                              </article>);
                        })}
                        </div>);
                })()}

                    {/* LIVE matches (non-promoted) */}
                    {(function () {
                    var liveMatches = homeMatchFlow.items.filter(function (m) { return getMatchStatus(m) === "live" && !(0, matches_1.canShowTicketForMatch)(m); });
                    if (liveMatches.length === 0)
                        return null;
                    return (<div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                              Live
                            </span>
                            <div className="flex-1 h-px bg-slate-200"/>
                          </div>
                          <ul className="space-y-2">
                            {liveMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>);
                })()}

                    {/* UPCOMING matches (non-promoted) */}
                    {(function () {
                    var upcomingMatches = homeMatchFlow.items.filter(function (m) { return getMatchStatus(m) === "upcoming" && !(0, matches_1.canShowTicketForMatch)(m); });
                    if (upcomingMatches.length === 0)
                        return null;
                    return (<div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                              Kommande
                            </span>
                            <div className="flex-1 h-px bg-slate-200"/>
                          </div>
                          <ul className="space-y-2">
                            {upcomingMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>);
                })()}

                    {/* FINISHED matches */}
                    {(function () {
                    var finishedMatches = homeMatchFlow.items.filter(function (m) { return getMatchStatus(m) === "finished"; });
                    if (finishedMatches.length === 0)
                        return null;
                    return (<div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                              Resultat
                            </span>
                            <div className="flex-1 h-px bg-slate-200"/>
                          </div>
                          <ul className="space-y-2">
                            {finishedMatches.map(renderHomeFlowRow)}
                          </ul>
                        </div>);
                })()}
                  </div>) : (<div className="py-10 text-center">
                    <p className="text-sm text-slate-400">
                      Inga matcher att visa just nu.
                    </p>
                    <link_1.default href="/matcher" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                      Se alla matcher <lucide_react_1.ArrowRight className="h-3.5 w-3.5"/>
                    </link_1.default>
                  </div>)}

                {homeMatchFlow.items.length > 0 && (<div className="mt-8 flex items-center justify-center gap-4">
                    <link_1.default href="/matcher" className="inline-flex items-center gap-2 border border-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white">
                      Alla matcher
                      <lucide_react_1.ArrowRight className="h-4 w-4"/>
                    </link_1.default>
                    <link_1.default href="/tabeller" className="inline-flex items-center gap-2 border border-emerald-700 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-700 hover:text-white">
                      Tabeller
                    </link_1.default>
                    {shopVisible && (<link_1.default href={shop_status_provider_1.SHOP_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline">
                        Besök butiken
                      </link_1.default>)}
                  </div>)}
              </div>
            </div>
          </section>)}

          {/* Instagram Feed Section */}
          <instagram_feed_1.InstagramFeed />

          {/* About Club Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className={"text-4xl font-bold ".concat(isPinkTheme ? "text-pink-600" : "text-green-600", " mb-2")} {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.title",
    })}>
                    {content.aboutClub.title}
                  </h2>

                  <p className="text-gray-700 mb-6" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.paragraph1",
    })}>
                    {content.aboutClub.paragraph1}
                  </p>

                  <p className="text-gray-700 mb-8" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.paragraph2",
    })}>
                    {content.aboutClub.paragraph2}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <lucide_react_1.Heart className={"w-8 h-8 ".concat(isPinkTheme ? "text-pink-600" : "text-green-600", " mx-auto mb-3")}/>
                      <h3 className="font-medium mb-2 text-black text-base">Passion</h3>
                      <p className="text-sm text-gray-600 leading-relaxed" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.passionText",
    })}>
                        {content.aboutClub.passionText}
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <lucide_react_1.TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-3"/>
                      <h3 className="font-medium mb-2 text-black text-base">Utveckling</h3>
                      <p className="text-sm text-gray-600 leading-relaxed" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.developmentText",
    })}>
                        {content.aboutClub.developmentText}
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <lucide_react_1.Users className={"w-8 h-8 ".concat(isPinkTheme ? "text-emerald-600" : "text-green-600", " mx-auto mb-3")}/>
                      <h3 className="font-medium mb-2 text-black text-base">Gemenskap</h3>
                      <p className="text-sm text-gray-600 leading-relaxed" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.communityText",
    })}>
                        {content.aboutClub.communityText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <link_1.default href={content.aboutClub.button1Link} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors">
                      <span {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.button1Text",
    })}>
                        {content.aboutClub.button1Text}
                      </span>
                    </link_1.default>
                    <link_1.default href={content.aboutClub.button2Link} className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors">
                      <span {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.button2Text",
    })}>
                        {content.aboutClub.button2Text}
                      </span>
                    </link_1.default>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
                    <image_1.default src={content.aboutClub.imageSrc || "/placeholder.svg"} alt="Härnösands HF ungdomslag" fill className="object-cover" loading="lazy" placeholder="blur" blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==" onContextMenu={function (e) { return e.preventDefault(); }} onDragStart={function (e) { return e.preventDefault(); }} {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.imageSrc",
    })}/>
                  </div>

                  <div className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-lg p-4 shadow-lg">
                    <div className="text-3xl font-bold" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.statNumber",
    })}>
                      {content.aboutClub.statNumber}
                    </div>
                    <div className="text-sm" {...(isEditorMode && {
        "data-editable": "true",
        "data-field-path": "home.aboutClub.statLabel",
    })}>
                      {content.aboutClub.statLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partners Section */}
          <section className="py-16">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-4xl font-bold text-center mb-2 text-orange-500">
                Partners
              </h2>
              <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
                Lokala företag som stödjer vår verksamhet och handbollen i Härnösand.
              </p>

              {/* Partners by tier — top tier expanded, rest collapsible */}
              <div className="space-y-4">
              {tierOrder.map(function (tierName, tierIndex) {
            var tierPartners = partnersByTier[tierName];
            if (!tierPartners || tierPartners.length === 0)
                return null;
            var isDiamant = tierName === "Diamantpartner";
            var isPlatina = tierName === "Platinapartner";
            var isTopTier = isDiamant || isPlatina;
            return (<details key={tierName} open={tierIndex === 0} className="group">
                    <summary className={"flex items-center justify-between cursor-pointer select-none rounded-xl px-5 py-3.5 transition-colors ".concat(isDiamant
                    ? "bg-amber-50 hover:bg-amber-100"
                    : isPlatina
                        ? "bg-slate-50 hover:bg-slate-100"
                        : "bg-gray-50 hover:bg-gray-100")}>
                      <div className="flex items-center gap-2.5">
                        {isDiamant && <lucide_react_1.Star className="w-4 h-4 text-amber-400 fill-amber-400"/>}
                        <h3 className={"text-base font-semibold ".concat(isDiamant ? "text-amber-700" : isPlatina ? "text-slate-700" : "text-gray-600")}>{tierName}</h3>
                        <span className="text-xs text-gray-400">{tierPartners.length}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </summary>
                    <div className={"grid gap-3 pt-4 pb-2 ".concat(isTopTier
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6")}>
                      {tierPartners.map(function (partner) { return (<a key={partner.id} href={partner.linkUrl || undefined} target={partner.linkUrl ? "_blank" : undefined} rel={partner.linkUrl ? "noopener noreferrer" : undefined} aria-label={partner.alt} className={"group/card relative flex flex-col items-center justify-center rounded-xl border bg-white p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md ".concat(isDiamant
                        ? "border-amber-200 hover:border-amber-300"
                        : isPlatina
                            ? "border-slate-200 hover:border-slate-300"
                            : "border-gray-100 hover:border-gray-200")} style={{ minHeight: isTopTier ? "120px" : "90px" }}>
                          <div className={"relative w-full ".concat(isTopTier ? "h-14" : "h-10", " mb-1.5")}>
                            <image_1.default src={partner.src || "/placeholder.svg"} alt={partner.alt} fill className="object-contain transition-transform duration-300 group-hover/card:scale-105" loading="lazy"/>
                          </div>
                          <p className="text-[11px] font-medium text-gray-500 text-center mt-auto leading-tight">{partner.alt}</p>
                        </a>); })}
                    </div>
                  </details>);
        })}
              </div>

              <section className={"".concat(isPinkTheme ? "bg-gradient-to-r from-rose-600 to-pink-700" : "bg-green-700", " text-white p-10 rounded-2xl shadow-sm text-center mt-16")}>
                <h2 className="text-4xl font-bold mb-4">Vill du stödja Härnösands HF?</h2>
                <p className="text-xl mb-8">
                  Vi välkomnar nya partners som vill stödja vår verksamhet och bidra till utvecklingen av handbollen i
                  regionen.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <link_1.default href="/kontakt" className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform transform hover:scale-105">
                    Kontakta oss för mer information
                  </link_1.default>
                </div>
              </section>

              <section className="py-16 text-center">
                <h2 className={"text-4xl font-bold ".concat(isPinkTheme ? "text-white" : "text-green-700", " mb-8")}>Bli en del av vårt lag!</h2>
                <p className="text-xl text-gray-700 mb-10 max-w-3xl mx-auto">
                  Oavsett om du är nybörjare eller erfaren spelare, finns det en plats för dig i Härnösands HF. Kom och
                  upplev glädjen med handboll!
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <button_1.Button asChild className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-md text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105">
                    <link_1.default href="/kontakt">Börja Träna</link_1.default>
                  </button_1.Button>
                  <button_1.Button asChild className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-md text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105">
                    <link_1.default href="/kontakt">Bli en del av föreningen</link_1.default>
                  </button_1.Button>
                </div>
              </section>
            </div>
          </section>

          {/* FAQ Section - Homepage specific */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12 max-w-4xl mx-auto shadow-sm">
                <h2 className="text-3xl font-bold text-green-700 mb-2 text-center">
                  Vanliga frågor
                </h2>
                <p className="text-center text-sm text-gray-500 mb-8">Om Härnösands HF och vår verksamhet</p>
                <accordion_1.Accordion type="single" collapsible className="w-full">
                  <accordion_1.AccordionItem value="item-1">
                    <accordion_1.AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Vad är Härnösands HF?
                    </accordion_1.AccordionTrigger>
                    <accordion_1.AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Härnösands HF är en handbollsförening i Härnösand som erbjuder handboll för alla åldrar — från de
                      allra yngsta till seniorlag. Vi har lag inom både dam- och herrverksamhet samt barn- och ungdomsverksamhet.
                    </accordion_1.AccordionContent>
                  </accordion_1.AccordionItem>
                  <accordion_1.AccordionItem value="item-2">
                    <accordion_1.AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Hur kan jag eller mitt barn börja spela?
                    </accordion_1.AccordionTrigger>
                    <accordion_1.AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Kontakta oss så hjälper vi dig hitta rätt lag! Vi erbjuder kostnadsfria provträningar. Du behöver bara
                      bekväma träningskläder och inomhusskor — handbollar finns att låna.
                      <link_1.default href="/kontakt" className="text-orange-500 hover:underline ml-1">Kontakta oss här.</link_1.default>
                    </accordion_1.AccordionContent>
                  </accordion_1.AccordionItem>
                  <accordion_1.AccordionItem value="item-3">
                    <accordion_1.AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Var spelas matcherna?
                    </accordion_1.AccordionTrigger>
                    <accordion_1.AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Våra hemmamatcher spelas huvudsakligen i Landgrenshallen i Härnösand. Se aktuellt matchschema på{" "}
                      <link_1.default href="/matcher" className="text-orange-500 hover:underline">matchsidan</link_1.default> för tider och platser.
                    </accordion_1.AccordionContent>
                  </accordion_1.AccordionItem>
                  <accordion_1.AccordionItem value="item-4">
                    <accordion_1.AccordionTrigger className="text-base font-semibold text-gray-800 hover:no-underline">
                      Hur köper jag biljetter?
                    </accordion_1.AccordionTrigger>
                    <accordion_1.AccordionContent className="text-gray-600 text-sm leading-relaxed">
                      Biljetter köps via Clubmate. Gå till{" "}
                      <link_1.default href="/kop-biljett" className="text-orange-500 hover:underline">biljettsidan</link_1.default> för att
                      komma direkt till biljettköpet. Du kan även köpa biljetter vid ingången på matchdagen.
                    </accordion_1.AccordionContent>
                  </accordion_1.AccordionItem>
                </accordion_1.Accordion>
              </div>
            </div>
          </section>
        </main>
        {selectedMatch && (<match_feed_modal_1.MatchFeedModal isOpen={true} onClose={function () {
                setSelectedMatchId(null);
                setSelectedMatchSnapshot(null);
            }} matchFeed={getMergedTimeline(selectedMatch)} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} finalScore={selectedMatch.result} matchStatus={selectedMatch.matchStatus} matchId={selectedMatch.id} matchData={selectedMatch} clockState={(_b = clockStateByMatchId[selectedMatch.id]) !== null && _b !== void 0 ? _b : null} penalties={(_c = penaltiesByMatchId[selectedMatch.id]) !== null && _c !== void 0 ? _c : []} topScorers={(_d = topScorersByMatchId[selectedMatch.id]) !== null && _d !== void 0 ? _d : []} onRefresh={function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!isFinal4) return [3 /*break*/, 2];
                            return [4 /*yield*/, (0, use_final4_data_1.forceFinal4Poll)().catch(function () { return undefined; })];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, (0, use_match_data_1.forceMatchDataPoll)().catch(function () { return undefined; })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, fetchMatchTimeline(selectedMatch, true).catch(function () { return undefined; })];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); }}/>)}
        <footer_1.default />

      </div>
    </error_boundary_1.ErrorBoundary>);
}
