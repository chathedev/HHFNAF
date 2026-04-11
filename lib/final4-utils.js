"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFinal4TimelineAvailable = exports.getFinal4DisplayScore = exports.getFinal4DerivedStatus = exports.getFinal4VenueLabel = exports.getFinal4MatchStartTimestamp = void 0;
var venue_mapper_1 = require("./venue-mapper");
var MATCH_DURATION_MS = 90 * 60 * 1000;
var FINAL4_TIMEZONE_OFFSET = "+02:00";
var parseScore = function (result) {
    var parsed = String(result || "").trim().match(/(\d+)\s*[-–]\s*(\d+)/);
    if (!parsed)
        return null;
    var home = Number(parsed[1]);
    var away = Number(parsed[2]);
    if (!Number.isFinite(home) || !Number.isFinite(away))
        return null;
    return { home: home, away: away };
};
var getFinal4MatchStartTimestamp = function (match) {
    var _a;
    var time = ((_a = match.time) === null || _a === void 0 ? void 0 : _a.trim()) || "00:00";
    var timestamp = Date.parse("".concat(match.date, "T").concat(time, ":00").concat(FINAL4_TIMEZONE_OFFSET));
    return Number.isFinite(timestamp) ? timestamp : null;
};
exports.getFinal4MatchStartTimestamp = getFinal4MatchStartTimestamp;
var getFinal4VenueLabel = function (venue) {
    var mapped = (0, venue_mapper_1.mapVenueIdToName)(venue);
    if (!mapped)
        return undefined;
    var trimmed = mapped.trim().replace(/(?:\s*,\s*|\s+)Härnösand$/i, ", Härnösand");
    return /^\d{1,4}$/.test(trimmed) ? undefined : trimmed;
};
exports.getFinal4VenueLabel = getFinal4VenueLabel;
var getFinal4DerivedStatus = function (match, nowMs) {
    if (nowMs === void 0) { nowMs = Date.now(); }
    var startTs = (0, exports.getFinal4MatchStartTimestamp)(match);
    var homeScore = typeof match.homeScore === "number" ? match.homeScore : null;
    var awayScore = typeof match.awayScore === "number" ? match.awayScore : null;
    var hasScore = homeScore !== null && awayScore !== null;
    var hasRealScore = hasScore && !(homeScore === 0 && awayScore === 0);
    var rawStatus = match.matchStatus;
    if (startTs !== null && nowMs < startTs) {
        return "upcoming";
    }
    if (rawStatus === "finished") {
        return "finished";
    }
    if (rawStatus === "live") {
        return "live";
    }
    if (hasRealScore && startTs !== null && nowMs >= startTs + MATCH_DURATION_MS) {
        return "finished";
    }
    if (startTs !== null && nowMs >= startTs && nowMs <= startTs + MATCH_DURATION_MS) {
        return "live";
    }
    return "upcoming";
};
exports.getFinal4DerivedStatus = getFinal4DerivedStatus;
var getFinal4DisplayScore = function (match, nowMs) {
    if (nowMs === void 0) { nowMs = Date.now(); }
    var status = (0, exports.getFinal4DerivedStatus)(match, nowMs);
    if (status === "upcoming") {
        return null;
    }
    var numericScore = typeof match.homeScore === "number" && typeof match.awayScore === "number"
        ? { home: match.homeScore, away: match.awayScore }
        : parseScore(match.result);
    if (!numericScore) {
        return null;
    }
    if (numericScore.home === 0 && numericScore.away === 0) {
        return null;
    }
    return "".concat(numericScore.home, "-").concat(numericScore.away);
};
exports.getFinal4DisplayScore = getFinal4DisplayScore;
var isFinal4TimelineAvailable = function (match, nowMs) {
    if (nowMs === void 0) { nowMs = Date.now(); }
    var home = match.homeName || "";
    var away = match.awayName || "";
    var hasPlaceholder = [home, away].some(function (name) { return name.startsWith("Winner ") || name.startsWith("Loser ") || name === "TBD"; });
    if (hasPlaceholder || !match.detailUrl) {
        return false;
    }
    return (0, exports.getFinal4DerivedStatus)(match, nowMs) !== "upcoming";
};
exports.isFinal4TimelineAvailable = isFinal4TimelineAvailable;
