(function (global) {
    "use strict";

    function s(value) {
        return value === null || value === undefined
            ? ""
            : String(value).trim();
    }

    function n(value) {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    function datasetObjects(dataset) {
        const headers = Array.isArray(dataset?.headers) ? dataset.headers : [];
        const rows = Array.isArray(dataset?.rows) ? dataset.rows : [];

        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ?? "";
            });
            return obj;
        });
    }

    function parseDate(value) {
        if (!value) return null;

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            const epoch = new Date(1899, 11, 30, 0, 0, 0, 0).getTime();
            const d = new Date(epoch + value * 86400000);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        const text = s(value);
        if (!text) return null;

        const d = new Date(text);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function dateKey(date) {
        if (!date || Number.isNaN(date.getTime())) return null;
        return (
            date.getFullYear() * 10000 +
            (date.getMonth() + 1) * 100 +
            date.getDate()
        );
    }

    function ageBuckets(mode) {
        if (mode === "年代（5歳ずらし）") {
            return [
                "15-25歳",
                "26-35歳",
                "36-45歳",
                "46-55歳",
                "56-65歳",
                "66-75歳",
                "76-85歳",
                "その他"
            ];
        }

        return [
            "10代",
            "20代",
            "30代",
            "40代",
            "50代",
            "60代",
            "70代",
            "その他"
        ];
    }

    function ageBucket(age, mode) {
        const a = n(age);
        if (a === null) return "その他";

        if (mode === "年代（5歳ずらし）") {
            if (a >= 15 && a <= 25) return "15-25歳";
            if (a >= 26 && a <= 35) return "26-35歳";
            if (a >= 36 && a <= 45) return "36-45歳";
            if (a >= 46 && a <= 55) return "46-55歳";
            if (a >= 56 && a <= 65) return "56-65歳";
            if (a >= 66 && a <= 75) return "66-75歳";
            if (a >= 76 && a <= 85) return "76-85歳";
            return "その他";
        }

        if (a >= 10 && a <= 19) return "10代";
        if (a >= 20 && a <= 29) return "20代";
        if (a >= 30 && a <= 39) return "30代";
        if (a >= 40 && a <= 49) return "40代";
        if (a >= 50 && a <= 59) return "50代";
        if (a >= 60 && a <= 69) return "60代";
        if (a >= 70 && a <= 79) return "70代";
        return "その他";
    }

    function isTargetAge(age, minAge, maxAge) {
        const a = n(age);
        if (a === null) return false;

        const min = n(minAge);
        const max = n(maxAge);

        if (min !== null && a < min) return false;
        if (max !== null && a > max) return false;
        return true;
    }

    function targetLabel(minAge, maxAge) {
        const min = n(minAge);
        const max = n(maxAge);

        if (min !== null && max !== null) return `${min}-${max}歳`;
        if (min !== null) return `${min}歳以上`;
        if (max !== null) return `${max}歳以下`;
        return "全年齢";
    }

    function filterBySettings(records, settings) {
        const start = parseDate(settings?.["集計開始日"]);
        const end = parseDate(settings?.["集計終了日"]);
        const startKey = dateKey(start);
        const endKey = dateKey(end);

        return records.filter(record => {
            const date = parseDate(record["応募日時"]);
            const key = dateKey(date);

            if (startKey !== null && (key === null || key < startKey)) return false;
            if (endKey !== null && (key === null || key > endKey)) return false;
            return true;
        });
    }

    function aggregateAge(records, settings) {
        const mode =
            s(settings?.["年齢区分"]) === "年代（5歳ずらし）"
                ? "年代（5歳ずらし）"
                : "年代";

        const buckets = ageBuckets(mode);
        const counts = Object.fromEntries(buckets.map(label => [label, 0]));

        records.forEach(record => {
            const label = ageBucket(record["年齢"], mode);
            counts[label] = (counts[label] || 0) + 1;
        });

        const total = records.length || 0;

        return buckets.map(label => ({
            label,
            count: counts[label] || 0,
            share: total ? (counts[label] || 0) / total : 0
        }));
    }

    function aggregateMedia(records, settings) {
        const minAge = settings?.["ターゲット年齢下限"];
        const maxAge = settings?.["ターゲット年齢上限"];
        const map = new Map();

        records.forEach(record => {
            const label = s(record["応募媒体"]) || "（未設定）";

            if (!map.has(label)) {
                map.set(label, {
                    label,
                    count: 0,
                    targetCount: 0
                });
            }

            const item = map.get(label);
            item.count += 1;

            if (isTargetAge(record["年齢"], minAge, maxAge)) {
                item.targetCount += 1;
            }
        });

        const total = records.length || 0;

        return Array.from(map.values())
            .map(item => ({
                ...item,
                share: total ? item.count / total : 0,
                targetRate: item.count ? item.targetCount / item.count : 0
            }))
            .sort((a, b) => {
                if (a.count !== b.count) return b.count - a.count;
                return a.label.localeCompare(b.label, "ja");
            });
    }

    function aggregateViewerMvp(viewerResponse) {
        const settings = viewerResponse?.settings || {};
        const appDataset = viewerResponse?.datasets?.applicationData || {
            headers: [],
            rows: []
        };

        const allRecords = datasetObjects(appDataset);
        const records = filterBySettings(allRecords, settings);

        const minAge = settings["ターゲット年齢下限"];
        const maxAge = settings["ターゲット年齢上限"];

        const targetCount = records.reduce(
            (sum, record) =>
                sum +
                (isTargetAge(record["年齢"], minAge, maxAge) ? 1 : 0),
            0
        );

        const matchedCount = records.reduce(
            (sum, record) =>
                sum +
                (String(record["求人データ突合フラグ"]).trim() === "1" ? 1 : 0),
            0
        );

        return {
            settings,
            records,
            totalCount: records.length,
            targetCount,
            targetRate: records.length ? targetCount / records.length : 0,
            matchedCount,
            matchedRate: records.length ? matchedCount / records.length : 0,
            targetLabel: targetLabel(minAge, maxAge),
            ageMode:
                s(settings["年齢区分"]) === "年代（5歳ずらし）"
                    ? "年代（5歳ずらし）"
                    : "年代",
            ageRows: aggregateAge(records, settings),
            mediaRows: aggregateMedia(records, settings)
        };
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("ja-JP");
    }

    function formatPercent(value, digits = 1) {
        const num = Number(value);
        if (!Number.isFinite(num)) return "-";
        return `${(num * 100).toFixed(digits)}%`;
    }

    global.ValidApplicationAnalysisCore = {
        datasetObjects,
        parseDate,
        ageBuckets,
        ageBucket,
        isTargetAge,
        targetLabel,
        filterBySettings,
        aggregateAge,
        aggregateMedia,
        aggregateViewerMvp,
        formatNumber,
        formatPercent
    };
})(window);
