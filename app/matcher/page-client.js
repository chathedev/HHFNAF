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
exports.MatcherPageClient = MatcherPageClient;
var react_1 = require("react");
var link_1 = require("next/link");
var match_card_utils_1 = require("@/lib/match-card-utils");
var use_match_data_1 = require("@/lib/use-match-data");
var use_final4_data_1 = require("@/lib/use-final4-data");
var match_card_cta_1 = require("@/components/match-card-cta");
var match_feed_modal_1 = require("@/components/match-feed-modal");
var matches_1 = require("@/lib/matches");
var team_display_1 = require("@/lib/team-display");
var match_sort_1 = require("@/lib/match-sort");
var match_timeline_1 = require("@/lib/match-timeline");
var final4_utils_1 = require("@/lib/final4-utils");
var getMatchStatus = function (match) {
    var _a;
    // TRUST BACKEND COMPLETELY - it knows the real match status
    return match.matchStatus === "halftime" ? "live" : ((_a = match.matchStatus) !== null && _a !== void 0 ? _a : "upcoming");
};
var TEAM_OPTION_VALUES = [
    "Dam/utv",
    "A-lag Herrar",
    "Fritids-Teknikskola",
    "F19-Senior",
    "F16 (2009)",
    "F15 (2010)",
    "F14 (2011)",
    "F13 (2012)",
    "F12 (2013)",
    "F11 (2014)",
    "F10 (2015)",
    "F9 (2016)",
    "F8 (2017)",
    "F7 (2018)",
    "F6 (2019)",
    "P16 (2009/2010)",
    "P14 (2011)",
    "P13 (2012)",
    "P12 (2013/2014)",
    "P10 (2015)",
    "P9 (2016)",
    "P8 (2017)",
    "P7 (2018)",
];
var buildTeamKeys = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    var set = team_display_1.createTeamMatchKeySet.apply(void 0, values);
    values.forEach(function (value) {
        var extended = (0, team_display_1.extendTeamDisplayName)(value);
        if (extended && extended !== value) {
            (0, team_display_1.createTeamMatchKeySet)(extended).forEach(function (key) { return set.add(key); });
        }
    });
    return set;
};
var TEAM_MATCH_KEY_MAP = {
    "Dam/utv": buildTeamKeys("Dam/utv", "Dam", "A-lag Dam", "Dam-utv"),
    "A-lag Herrar": buildTeamKeys("A-lag Herrar", "Herr", "Herr-utv"),
};
TEAM_OPTION_VALUES.forEach(function (value) {
    if (!TEAM_MATCH_KEY_MAP[value]) {
        TEAM_MATCH_KEY_MAP[value] = buildTeamKeys(value);
    }
});
var TEAM_OPTIONS = TEAM_OPTION_VALUES.map(function (value) { return ({
    value: value,
    label: (0, team_display_1.extendTeamDisplayName)(value),
}); });
var STATUS_OPTIONS = [
    { value: "current", label: "Översikt" },
    { value: "live", label: "Live nu" },
    { value: "upcoming", label: "Kommande" },
    { value: "finished", label: "Avslutade" },
];
var API_BASE_URL = (typeof process !== "undefined" && ((_a = process.env.NEXT_PUBLIC_MATCH_API_BASE) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, ""))) ||
    "https://api.harnosandshf.se";
function final4ToNormalized(m) {
    var _a, _b;
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
        timelineAvailable: (0, final4_utils_1.isFinal4TimelineAvailable)(m),
    };
}
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
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
function StandingsSection(_a) {
    var selectedTeam = _a.selectedTeam;
    var _b = (0, react_1.useState)([]), standings = _b[0], setStandings = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(null), expandedSeries = _d[0], setExpandedSeries = _d[1];
    (0, react_1.useEffect)(function () {
        var url = selectedTeam && selectedTeam !== "all"
            ? "".concat(API_BASE_URL, "/matcher/standings?team=").concat(encodeURIComponent(selectedTeam))
            : "".concat(API_BASE_URL, "/matcher/standings");
        setLoading(true);
        fetch(url, { cache: "no-store" })
            .then(function (res) { return res.ok ? res.json() : Promise.reject("Failed"); })
            .then(function (data) {
            // API returns { seriesName: [{team, M, W, D, L, GF, GA, GD, P}, ...] }
            var parsed = Object.entries(data)
                .filter(function (_a) {
                var teams = _a[1];
                return Array.isArray(teams) && teams.length > 0;
            })
                .map(function (_a) {
                var series = _a[0], teams = _a[1];
                return ({
                    series: series,
                    teams: teams.map(function (t) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                        return ({
                            team: (_a = t.team) !== null && _a !== void 0 ? _a : "",
                            played: (_b = t.M) !== null && _b !== void 0 ? _b : 0,
                            wins: (_c = t.W) !== null && _c !== void 0 ? _c : 0,
                            draws: (_d = t.D) !== null && _d !== void 0 ? _d : 0,
                            losses: (_e = t.L) !== null && _e !== void 0 ? _e : 0,
                            goalsFor: (_f = t.GF) !== null && _f !== void 0 ? _f : 0,
                            goalsAgainst: (_g = t.GA) !== null && _g !== void 0 ? _g : 0,
                            goalDifference: (_h = t.GD) !== null && _h !== void 0 ? _h : 0,
                            points: (_j = t.P) !== null && _j !== void 0 ? _j : 0,
                        });
                    }),
                });
            })
                .sort(function (a, b) { return b.teams.length - a.teams.length; });
            setStandings(parsed);
            if (parsed.length > 0) {
                setExpandedSeries(parsed[0].series);
            }
        })
            .catch(function () { return setStandings([]); })
            .finally(function () { return setLoading(false); });
    }, [selectedTeam]);
    if (loading) {
        return (<section className="mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"/>
          <p className="mt-3 text-sm text-slate-500">Hämtar tabeller...</p>
        </div>
      </section>);
    }
    if (standings.length === 0)
        return null;
    return (<section id="tabeller" className="mt-8 scroll-mt-8">
      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.95))] px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Tabeller</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Serieställning</h2>
          <p className="mt-1 text-sm text-slate-500">Beräknad från matchresultat. 2p för vinst, 1p för oavgjort.</p>
        </div>

        <div className="divide-y divide-slate-100 p-4 sm:p-5">
          {standings.map(function (s) {
            var isExpanded = expandedSeries === s.series;
            return (<div key={s.series} className="py-3 first:pt-0 last:pb-0">
                <button onClick={function () { return setExpandedSeries(isExpanded ? null : s.series); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-900">{s.series}</span>
                  <span className="text-xs text-slate-400">{isExpanded ? "−" : "+"}</span>
                </button>
                {isExpanded && (<div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Lag</th>
                          <th className="px-3 py-2.5 text-center">M</th>
                          <th className="px-3 py-2.5 text-center">V</th>
                          <th className="px-3 py-2.5 text-center">O</th>
                          <th className="px-3 py-2.5 text-center">F</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">GM</th>
                          <th className="px-3 py-2.5 text-center hidden sm:table-cell">IM</th>
                          <th className="px-3 py-2.5 text-center">+/−</th>
                          <th className="px-3 py-2.5 text-center font-bold">P</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {s.teams.map(function (team, idx) {
                        var isHHF = team.team.toLowerCase().includes("härnösand") || team.team.toLowerCase().includes("harnosand");
                        return (<tr key={team.team} className={"".concat(isHHF ? "bg-emerald-50/60 font-medium" : "", " hover:bg-slate-50/80 transition")}>
                              <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                                {isHHF && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle"/>}
                                {team.team}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.played}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.wins}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.draws}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{team.losses}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.goalsFor}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 hidden sm:table-cell">{team.goalsAgainst}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={"text-xs font-medium ".concat(team.goalDifference > 0 ? "text-emerald-600" : team.goalDifference < 0 ? "text-rose-500" : "text-slate-400")}>
                                  {team.goalDifference > 0 ? "+" : ""}{team.goalDifference}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">{team.points}</td>
                            </tr>);
                    })}
                      </tbody>
                    </table>
                  </div>)}
              </div>);
        })}
        </div>
      </div>
    </section>);
}
function MatcherPageClient(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f;
    var initialData = _a.initialData, _g = _a.isFinal4, isFinal4 = _g === void 0 ? false : _g, final4InitialData = _a.final4InitialData;
    var _h = (0, react_1.useState)("all"), selectedTeam = _h[0], setSelectedTeam = _h[1];
    var _j = (0, react_1.useState)("current"), statusFilter = _j[0], setStatusFilter = _j[1];
    var _k = (0, react_1.useState)(null), selectedMatchId = _k[0], setSelectedMatchId = _k[1];
    var _l = (0, react_1.useState)({}), timelineByMatchId = _l[0], setTimelineByMatchId = _l[1];
    var _m = (0, react_1.useState)({}), topScorersByMatchId = _m[0], setTopScorersByMatchId = _m[1];
    var _o = (0, react_1.useState)({}), clockStateByMatchId = _o[0], setClockStateByMatchId = _o[1];
    var _p = (0, react_1.useState)({}), penaltiesByMatchId = _p[0], setPenaltiesByMatchId = _p[1];
    var timelineFetchInFlightRef = (0, react_1.useRef)({});
    var timelineFetchedAtRef = (0, react_1.useRef)({});
    var _q = (0, react_1.useState)(false), hasResolvedLiveData = _q[0], setHasResolvedLiveData = _q[1];
    var _r = (0, react_1.useState)(false), hasResolvedOldData = _r[0], setHasResolvedOldData = _r[1];
    var _s = (0, react_1.useState)(false), hasAttemptedLiveFetch = _s[0], setHasAttemptedLiveFetch = _s[1];
    var _t = (0, react_1.useState)(false), hasAttemptedOldFetch = _t[0], setHasAttemptedOldFetch = _t[1];
    // Final4: fetch from dedicated endpoint and convert to NormalizedMatch
    var _u = (0, use_final4_data_1.useFinal4Data)(final4InitialData), final4Data = _u.data, final4Loading = _u.loading;
    var final4Matches = (0, react_1.useMemo)(function () {
        if (!isFinal4 || !final4Data)
            return [];
        return final4Data.matches.map(final4ToNormalized);
    }, [isFinal4, final4Data]);
    var _v = (0, use_match_data_1.useMatchData)({
        dataType: "liveUpcoming",
        initialData: initialData,
        enabled: !isFinal4,
    }), liveUpcomingMatches_raw = _v.matches, liveLoading_raw = _v.loading, liveError = _v.error, hasLivePayload_raw = _v.hasPayload, hasClientMatchData = _v.hasClientData;
    var _w = (0, use_match_data_1.useMatchData)({
        dataType: "old",
        enabled: !isFinal4,
    }), oldMatches_raw = _w.matches, oldLoading_raw = _w.loading, oldError = _w.error, hasOldPayload_raw = _w.hasPayload;
    // Override with Final4 data when on Final4 subdomain
    var liveUpcomingMatches = isFinal4 ? final4Matches : liveUpcomingMatches_raw;
    var oldMatches = isFinal4 ? [] : oldMatches_raw;
    var liveLoading = isFinal4 ? final4Loading : liveLoading_raw;
    var oldLoading = isFinal4 ? false : oldLoading_raw;
    var hasLivePayload = isFinal4 ? Boolean(final4Data) : hasLivePayload_raw;
    var hasOldPayload = isFinal4 ? true : hasOldPayload_raw;
    var hasCurrentPayload = statusFilter === "finished" ? hasOldPayload : hasLivePayload && (statusFilter !== "current" || hasOldPayload);
    var isLoading = statusFilter === "finished"
        ? oldLoading || !hasOldPayload
        : statusFilter === "current"
            ? liveLoading || !hasLivePayload
            : liveLoading || !hasLivePayload;
    var activeError = statusFilter === "finished"
        ? oldError
        : statusFilter === "current"
            ? liveError !== null && liveError !== void 0 ? liveError : oldError
            : liveError;
    var hasResolvedActiveData = statusFilter === "finished"
        ? hasResolvedOldData
        : statusFilter === "current"
            ? hasResolvedLiveData && hasResolvedOldData
            : hasResolvedLiveData;
    var hasLoadedAnyMatches = liveUpcomingMatches.length > 0 || oldMatches.length > 0;
    (0, react_1.useEffect)(function () {
        if (!hasAttemptedLiveFetch && !liveLoading) {
            setHasAttemptedLiveFetch(true);
        }
        if (!hasResolvedLiveData && hasLivePayload && !liveLoading) {
            setHasResolvedLiveData(true);
        }
    }, [hasAttemptedLiveFetch, hasResolvedLiveData, hasLivePayload, liveLoading]);
    (0, react_1.useEffect)(function () {
        if (!hasAttemptedOldFetch && !oldLoading) {
            setHasAttemptedOldFetch(true);
        }
        if (!hasResolvedOldData && hasOldPayload && !oldLoading) {
            setHasResolvedOldData(true);
        }
    }, [hasAttemptedOldFetch, hasResolvedOldData, hasOldPayload, oldLoading]);
    var liveMatchesCount = (0, react_1.useMemo)(function () { return liveUpcomingMatches.filter(function (match) { return getMatchStatus(match) === "live"; }).length; }, [liveUpcomingMatches]);
    var upcomingMatchesCount = (0, react_1.useMemo)(function () { return liveUpcomingMatches.filter(function (match) { return getMatchStatus(match) === "upcoming"; }).length; }, [liveUpcomingMatches]);
    var finishedMatchesCount = (0, react_1.useMemo)(function () { return __spreadArray(__spreadArray([], liveUpcomingMatches, true), oldMatches, true).filter(function (match) { return getMatchStatus(match) === "finished"; }).length; }, [liveUpcomingMatches, oldMatches]);
    var allMatches = (0, react_1.useMemo)(function () { return __spreadArray(__spreadArray([], liveUpcomingMatches, true), oldMatches, true); }, [liveUpcomingMatches, oldMatches]);
    var selectedMatch = (0, react_1.useMemo)(function () { var _a; return (_a = allMatches.find(function (match) { return match.id === selectedMatchId; })) !== null && _a !== void 0 ? _a : null; }, [allMatches, selectedMatchId]);
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
    var teamOptions = TEAM_OPTIONS;
    var selectedTeamKeys = (0, react_1.useMemo)(function () {
        var _a;
        if (selectedTeam === "all") {
            return null;
        }
        return (_a = TEAM_MATCH_KEY_MAP[selectedTeam]) !== null && _a !== void 0 ? _a : buildTeamKeys(selectedTeam);
    }, [selectedTeam]);
    var matchesForFilter = (0, react_1.useMemo)(function () {
        var seenIds = new Set();
        var mergedMatches = __spreadArray(__spreadArray([], liveUpcomingMatches, true), oldMatches, true).filter(function (match) {
            if (seenIds.has(match.id)) {
                return false;
            }
            seenIds.add(match.id);
            return true;
        });
        if (statusFilter === "finished") {
            return mergedMatches.filter(function (match) { return getMatchStatus(match) === "finished"; });
        }
        return mergedMatches;
    }, [statusFilter, liveUpcomingMatches, oldMatches]);
    var filteredMatches = (0, react_1.useMemo)(function () {
        return matchesForFilter.filter(function (match) {
            if (selectedTeamKeys) {
                var normalizedKey = match.normalizedTeam;
                if (!selectedTeamKeys.has(normalizedKey)) {
                    var fallbackKey = match.teamType ? (0, matches_1.normalizeMatchKey)(match.teamType) : "";
                    if (!fallbackKey || !selectedTeamKeys.has(fallbackKey)) {
                        return false;
                    }
                }
            }
            var status = getMatchStatus(match);
            if (statusFilter === "live" && status !== "live") {
                return false;
            }
            if (statusFilter === "upcoming" && status !== "upcoming") {
                return false;
            }
            if (statusFilter === "finished") {
                return status === "finished";
            }
            return true;
        });
    }, [matchesForFilter, selectedTeamKeys, statusFilter]);
    var groupedMatches = (0, react_1.useMemo)(function () {
        var live = [];
        var upcoming = [];
        var finished = [];
        filteredMatches.forEach(function (match) {
            var status = getMatchStatus(match);
            if (status === "live")
                live.push(match);
            else if (status === "upcoming")
                upcoming.push(match);
            else
                finished.push(match);
        });
        live.sort(match_sort_1.compareMatchesByDateAscStable);
        upcoming.sort(match_sort_1.compareMatchesByDateAscStable);
        finished.sort(function (a, b) {
            var _a, _b, _c, _d;
            var tsA = typeof a.startTimestamp === "number" ? a.startTimestamp : new Date(a.date).getTime();
            var tsB = typeof b.startTimestamp === "number" ? b.startTimestamp : new Date(b.date).getTime();
            var endA = (_b = (_a = (0, use_match_data_1.getMatchEndTime)(a)) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : (tsA + 90 * 60 * 1000);
            var endB = (_d = (_c = (0, use_match_data_1.getMatchEndTime)(b)) === null || _c === void 0 ? void 0 : _c.getTime()) !== null && _d !== void 0 ? _d : (tsB + 90 * 60 * 1000);
            if (endA !== endB) {
                return endB - endA;
            }
            return (0, match_sort_1.compareMatchesByDateDescStable)(a, b);
        });
        return { live: live, upcoming: upcoming, finished: finished };
    }, [filteredMatches]);
    var renderMatchCard = function (match) {
        var _a, _b;
        var status = (0, match_card_utils_1.getSimplifiedMatchStatus)(match);
        var canOpenTimeline = (0, match_card_utils_1.canOpenMatchTimeline)(match);
        var scheduleLabel = (0, match_card_utils_1.buildMatchScheduleLabel)(match);
        var matchupLabel = (0, match_card_utils_1.getMatchupLabel)(match);
        var showProfixioWarning = (0, match_card_utils_1.shouldShowProfixioTechnicalIssue)(match);
        var showFinishedZeroZeroIssue = (0, match_card_utils_1.shouldShowFinishedZeroZeroIssue)(match);
        var teamTypeRaw = ((_a = match.teamType) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        var teamTypeLabel = (0, team_display_1.extendTeamDisplayName)(teamTypeRaw) || teamTypeRaw || "Härnösands HF";
        var cleanedResult = (_b = match.result) === null || _b === void 0 ? void 0 : _b.trim();
        var isUnconfirmedZero = !hasClientMatchData && status === "live" && cleanedResult != null && /^0\s*[-–—]\s*0$/.test(cleanedResult);
        var scoreValue = status === "upcoming" || match.resultState === "not_started" || match.resultState === "live_pending" || isUnconfirmedZero
            ? null
            : cleanedResult && cleanedResult.length > 0
                ? cleanedResult
                : status === "finished"
                    ? "Resultat inväntas"
                    : null;
        var showLivePendingScore = status === "live" && (match.resultState === "live_pending" || isUnconfirmedZero);
        var statusBadge = (function () {
            var _a, _b, _c;
            if (status === "live") {
                return { label: (_a = match.statusLabel) !== null && _a !== void 0 ? _a : "LIVE", tone: "bg-rose-50 text-rose-600" };
            }
            if (status === "finished") {
                return { label: (_b = match.statusLabel) !== null && _b !== void 0 ? _b : "SLUT", tone: "bg-gray-100 text-gray-600" };
            }
            return { label: (_c = match.statusLabel) !== null && _c !== void 0 ? _c : "KOMMANDE", tone: "bg-blue-50 text-blue-600" };
        })();
        return (<article key={match.id} id={"match-card-".concat(match.id)} className={"relative rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 active:scale-[0.99] ".concat(canOpenTimeline ? "cursor-pointer hover:border-emerald-400 hover:shadow-lg" : "")} onMouseEnter={function () {
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
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">{teamTypeLabel}</p>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-tight text-slate-950 sm:text-lg">
              {matchupLabel}
            </h3>
            {scheduleLabel && <p className="mt-1 text-sm leading-6 text-slate-500 break-words">{scheduleLabel}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {match.series && <span className="rounded-full bg-slate-100 px-2.5 py-1">{match.series}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className={"inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ".concat(statusBadge.tone)}>
                {statusBadge.label}
              </span>
              {scoreValue && (<span className="text-lg font-black text-slate-950 sm:text-2xl" data-score-value="true">
                  {scoreValue}
                </span>)}
            </div>
            <div className="w-full xl:w-auto flex flex-wrap items-center gap-2">
              <match_card_cta_1.MatchCardCTA match={match} status={status}/>
            </div>
          </div>
        </div>
        {showLivePendingScore && (<p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
            Matchen är live men poängen har ännu inte publicerats.
          </p>)}
        {showProfixioWarning && (<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Liveuppdateringen har tekniska problem för den här matchen just nu.
          </p>)}
        {showFinishedZeroZeroIssue && (<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Misstänkt resultatfel: matchen är avslutad men står som 0–0. Kontrollera matchrapporten.
          </p>)}
      </article>);
    };
    var statusPanels = (0, react_1.useMemo)(function () {
        var allPanels = [
            {
                key: "live",
                label: "Live",
                title: "Pågår nu",
                description: "Matcher som just nu är igång.",
                matches: groupedMatches.live,
            },
            {
                key: "upcoming",
                label: "Kommande",
                title: "Närmast framåt",
                description: "Det som står på tur i matchkalendern.",
                matches: groupedMatches.upcoming,
            },
            {
                key: "finished",
                label: "Resultat",
                title: "Nyss klara",
                description: "Senaste resultaten.",
                matches: groupedMatches.finished,
            },
        ];
        if (statusFilter === "current") {
            return allPanels;
        }
        return allPanels.filter(function (panel) { return panel.key === statusFilter; });
    }, [groupedMatches, statusFilter]);
    var focusCards = (0, react_1.useMemo)(function () {
        var _a, _b, _c;
        var nextUpcoming = (_a = groupedMatches.upcoming[0]) !== null && _a !== void 0 ? _a : null;
        var nextLive = (_b = groupedMatches.live[0]) !== null && _b !== void 0 ? _b : null;
        var latestFinished = (_c = groupedMatches.finished[0]) !== null && _c !== void 0 ? _c : null;
        return [
            {
                label: "Live nu",
                value: groupedMatches.live.length.toString(),
                text: nextLive ? (0, match_card_utils_1.getMatchupLabel)(nextLive) : "Ingen match pågår just nu.",
                tone: "border-rose-200 bg-rose-50/70 text-rose-700",
            },
            {
                label: "Närmast framåt",
                value: groupedMatches.upcoming.length.toString(),
                text: nextUpcoming ? (0, match_card_utils_1.buildMatchScheduleLabel)(nextUpcoming) : "Inget nytt schema just nu.",
                tone: "border-sky-200 bg-sky-50/70 text-sky-700",
            },
            {
                label: "Senaste resultat",
                value: groupedMatches.finished.length.toString(),
                text: latestFinished ? (0, match_card_utils_1.getMatchupLabel)(latestFinished) : "Inga färska resultat just nu.",
                tone: "border-slate-200 bg-slate-100/90 text-slate-700",
            },
        ];
    }, [groupedMatches]);
    var activeStatusLabel = (_c = (_b = STATUS_OPTIONS.find(function (option) { return option.value === statusFilter; })) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : "Översikt";
    var renderStatusPanel = function (panel) { return (<section key={panel.key} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.95))] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">{panel.label}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{panel.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{panel.description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {panel.matches.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {panel.matches.length > 0 ? (<div className="space-y-3">{panel.matches.map(renderMatchCard)}</div>) : (<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Inga matcher i den här vyn just nu.
          </div>)}
      </div>
    </section>); };
    (0, react_1.useEffect)(function () {
        // Remove ?team filtering from URL, only set selectedTeam from dropdown
        // This disables auto-select from URL and fixes jumping back to 'Alla lag'
        // User can only select team from dropdown
        // eslint-disable-next-line
    }, [teamOptions]);
    return (<main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_32%,#f8fafc_100%)] py-8 sm:py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96),rgba(236,253,245,0.82))] px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <link_1.default href="/" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-900">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                  Till startsidan
                </link_1.default>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600">Matchcenter</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Matcher i ett lugnare flöde.</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
                  En tydligare matchsida för live, kommande och resultat. Filtrera lag, byt vy och öppna detaljläget där tidslinje finns.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
                {focusCards.map(function (card) { return (<div key={card.label} className={"rounded-2xl border px-4 py-4 ".concat(card.tone)}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">{card.label}</p>
                    <p className="mt-2 text-2xl font-black">{card.value}</p>
                    <p className="mt-2 text-sm leading-5 opacity-90">{card.text}</p>
                  </div>); })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:px-8 sm:py-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
            <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Filtrering</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Välj lag och vy</h2>
                  <p className="mt-1 text-sm text-slate-500">Byt mellan hel översikt, live, kommande eller avslutade matcher.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-1.5">
                  {STATUS_OPTIONS.map(function (option) {
            var isActive = statusFilter === option.value;
            return (<button key={option.value} type="button" aria-pressed={isActive} onClick={function () { return setStatusFilter(option.value); }} className={"rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition sm:text-sm ".concat(isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                        {option.label}
                      </button>);
        })}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="max-w-md">
                  <label htmlFor="team-filter" className="block text-sm font-semibold text-slate-900">
                    Lag
                  </label>
                  <select id="team-filter" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition focus:border-emerald-400 focus:outline-none" value={selectedTeam} onChange={function (e) { return setSelectedTeam(e.target.value); }}>
                    <option value="all">Alla lag</option>
                    {teamOptions.map(function (team) { return (<option key={team.value} value={team.value}>
                        {team.label}
                      </option>); })}
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Aktiv vy</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{activeStatusLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Totalt</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{filteredMatches.length} matcher</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Detaljläge</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">Endast där tidslinje finns</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] bg-slate-950 p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Så fungerar sidan</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold">Alltid uppdaterat</p>
                  <p className="mt-1 text-sm text-white/70">Live, kommande och avslutade matcher uppdateras automatiskt.</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold">Resultat nära i tiden</p>
                  <p className="mt-1 text-sm text-white/70">Färska resultat visas överst innan de glider över till historik.</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold">Tidslinje när den finns</p>
                  <p className="mt-1 text-sm text-white/70">Matchdetalj öppnas när tidslinjedata finns tillgänglig.</p>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* Link to standings page */}
        <div className="mt-6 flex justify-center">
          <link_1.default href="/tabeller" className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
            </svg>
            Se alla tabeller och serieställningar
          </link_1.default>
        </div>

        <div className="mt-8 space-y-6">
          {activeError && (<div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm font-medium text-red-800">{activeError}</p>
              </div>
            </div>)}

          {(isLoading || (!activeError && !hasLoadedAnyMatches)) && filteredMatches.length === 0 && (<div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"/>
              <p className="mt-4 text-sm font-medium text-slate-600">Hämtar matcher...</p>
            </div>)}

          {!isLoading &&
            filteredMatches.length === 0 &&
            !activeError &&
            hasCurrentPayload &&
            hasResolvedActiveData &&
            hasLoadedAnyMatches &&
            (statusFilter === "finished" ? hasAttemptedOldFetch : hasAttemptedLiveFetch) && (<div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <svg className="mx-auto h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Inga matcher hittades</h2>
              <p className="mt-2 text-sm text-slate-500">Ändra lag eller byt vy för att se fler matcher.</p>
              <button onClick={function () {
                setSelectedTeam("all");
                setStatusFilter("current");
            }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Återställ filter
              </button>
            </div>)}

          {!isLoading && filteredMatches.length > 0 && <div className="space-y-5">{statusPanels.map(renderStatusPanel)}</div>}
        </div>

      </div>

      {selectedMatch && (<match_feed_modal_1.MatchFeedModal isOpen={true} onClose={function () { return setSelectedMatchId(null); }} matchFeed={getMergedTimeline(selectedMatch)} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} finalScore={selectedMatch.result} matchStatus={selectedMatch.matchStatus} matchId={selectedMatch.id} matchData={selectedMatch} clockState={(_d = clockStateByMatchId[selectedMatch.id]) !== null && _d !== void 0 ? _d : null} penalties={(_e = penaltiesByMatchId[selectedMatch.id]) !== null && _e !== void 0 ? _e : []} topScorers={(_f = topScorersByMatchId[selectedMatch.id]) !== null && _f !== void 0 ? _f : []} onRefresh={function () { return __awaiter(_this, void 0, void 0, function () {
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
    </main>);
}
