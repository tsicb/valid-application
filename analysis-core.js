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

    function positiveInt(value, fallback) {
        const num = Math.floor(Number(value));
        return Number.isFinite(num) && num > 0 ? num : fallback;
    }

    function numberLabel(value) {
        return Number(value || 0).toLocaleString("ja-JP");
    }

    function readKeywordMaster(dataset) {
        const rows = datasetObjects(dataset);
        const result = [];
        const seen = new Set();

        rows.forEach(row => {
            const keyword = s(row["仕事名KW"]);
            if (!keyword || seen.has(keyword)) return;
            seen.add(keyword);
            result.push(keyword);
        });

        return result;
    }

    function matchKeywords(jobName, keywords) {
        const text = s(jobName);

        if (!text || !keywords.length) {
            return { single: "（該当なし）", full: "（該当なし）" };
        }

        const lower = text.toLowerCase();
        const matched = [];

        keywords.forEach(keyword => {
            if (lower.includes(keyword.toLowerCase())) matched.push(keyword);
        });

        if (!matched.length) {
            return { single: "（該当なし）", full: "（該当なし）" };
        }

        return {
            single: matched[0],
            full: matched.join("＋")
        };
    }

    function truthy(value) {
        return (
            value === true ||
            value === 1 ||
            value === "1" ||
            String(value).toUpperCase() === "TRUE"
        );
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

        const match = text.match(
            /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
        );

        if (match) {
            const d = new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3]),
                Number(match[4] || 0),
                Number(match[5] || 0),
                Number(match[6] || 0)
            );
            return Number.isNaN(d.getTime()) ? null : d;
        }

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

    function monthSortValue(label, dateObj) {
        const text = s(label);
        const m = text.match(/(\d{2,4})年(\d{1,2})月/);

        if (m) {
            let year = Number(m[1]);
            if (year < 100) year += 2000;
            return year * 100 + Number(m[2]);
        }

        if (dateObj instanceof Date && !Number.isNaN(dateObj.getTime())) {
            return dateObj.getFullYear() * 100 + (dateObj.getMonth() + 1);
        }

        return 999999;
    }

    function yesNoMatchLabel(value) {
        if (
            value === true ||
            value === 1 ||
            value === "1" ||
            value === "TRUE"
        ) {
            return "一致";
        }

        if (
            value === false ||
            value === 0 ||
            value === "0" ||
            value === "FALSE"
        ) {
            return "不一致";
        }

        return "（不明）";
    }

    function buildEnterpriseInfo(dataset) {
        const rows = datasetObjects(dataset);
        const map = {};
        let hasAnyDisplayName = false;

        rows.forEach(row => {
            const id = s(row["企業ID"]);
            const label = s(row["表示名"]);
            if (!id || !label) return;
            map[id] = label;
            hasAnyDisplayName = true;
        });

        return { map, hasAnyDisplayName };
    }


function noteFirstLine(value) {
    const text = s(value);
    if (!text) return "（求人備考なし）";
    const first = s(text.split(/<br\s*\/?>/i)[0]);
    return first || "（求人備考なし）";
}

function splitCodes(value) {
    const text = s(value);
    if (!text) return [];
    return text
        .split("::")
        .map(item => s(item))
        .filter(Boolean);
}

function displayLimit(value, fallback = 50) {
    const text = s(value);

    if (!text) return fallback;
    if (text === "すべて" || text.toLowerCase() === "all") {
        return Infinity;
    }

    const num = Number(text);
    return Number.isFinite(num) && num > 0
        ? Math.floor(num)
        : fallback;
}

function buildTagMaster(dataset) {
    const rows = datasetObjects(dataset);
    const map = {};

    rows.forEach(row => {
        const code = s(row["コード"]);
        if (!code) return;
        map[code] = s(row["表示名"]) || code;
    });

    return map;
}

function buildImageMap(dataset) {
    const rows = datasetObjects(dataset);
    const map = {};

    rows.forEach(row => {
        const fileName = s(row["画像ファイル名"]);
        const url = s(row["画像URL"]);
        if (fileName && url) map[fileName] = url;
    });

    return map;
}

    function buildViewerContext(viewerResponse) {
        const settings = viewerResponse?.settings || {};
        const ageMode =
            s(settings["年齢区分"]) === "年代（5歳ずらし）"
                ? "年代（5歳ずらし）"
                : "年代";

        const startKey = dateKey(parseDate(settings["集計開始日"]));
        const endKey = dateKey(parseDate(settings["集計終了日"]));
        const targetAgeMin = settings["ターゲット年齢下限"];
        const targetAgeMax = settings["ターゲット年齢上限"];

        const widths = {
            monthDay: positiveInt(settings["月内応募日幅"], 7),
            hour: positiveInt(settings["応募時間帯幅"], 6),
            text: positiveInt(settings["求人原稿文字数幅"], 300),
            tagCount: positiveInt(settings["Indeed求人タグ数幅"], 5),
            hourlySalary: positiveInt(settings["時給下限幅"], 50),
            dailySalary: positiveInt(settings["日給下限幅"], 1000),
            monthlySalary: positiveInt(settings["月給下限幅"], 50000),
            annualSalary: positiveInt(settings["年収下限幅"], 500000)
        };

        const indeedTagLimit =
            displayLimit(
                settings["Indeedタグ表示件数"],
                50
            );

        const topImageLimit =
            displayLimit(
                settings["TOP画像表示件数"],
                50
            );

        const apps = datasetObjects(
            viewerResponse?.datasets?.applicationData || {}
        );

        const jobs = datasetObjects(
            viewerResponse?.datasets?.jobAnalysisMaster || {}
        );

        const keywordMaster = readKeywordMaster(
            viewerResponse?.datasets?.keywordMaster || {}
        );

        const tagMaster = buildTagMaster(
            viewerResponse?.datasets?.indeedTagMaster || {}
        );

        const imageMap = buildImageMap(
            viewerResponse?.datasets?.imageMaster || {}
        );

        const jobMap = new Map();

        jobs.forEach(job => {
            const ref = s(job["求人参照ID"]);
            if (ref) jobMap.set(ref, job);
        });

        const enterpriseInfo = buildEnterpriseInfo(
            viewerResponse?.datasets?.enterpriseMaster || {}
        );

        const recordsAll = [];
        const recordsMatched = [];

        apps.forEach(app => {
            const appDate = parseDate(app["応募日時"]);
            const key = dateKey(appDate);

            if (startKey !== null && (key === null || key < startKey)) return;
            if (endKey !== null && (key === null || key > endKey)) return;

            const age = n(app["年齢"]);
            const jobRefId = s(app["求人参照ID"]);
            const matchedFlag = truthy(app["求人データ突合フラグ"]);
            const job =
                matchedFlag && jobRefId
                    ? (jobMap.get(jobRefId) || null)
                    : null;

            const enterpriseId = s(app["企業ID"]);
            let enterpriseLabel = enterpriseId;

            if (enterpriseInfo.hasAnyDisplayName) {
                enterpriseLabel =
                    enterpriseInfo.map[enterpriseId] ||
                    (enterpriseId
                        ? `${enterpriseId}（名称未登録）`
                        : "（企業IDなし）");
            }

            const keywordMatch = matchKeywords(
                job ? job["仕事名"] : "",
                keywordMaster
            );

            const noteFirst =
                job
                    ? noteFirstLine(job["求人備考"])
                    : "";

            const record = {
                app,
                job,
                matched: !!job,
                jobRefId,
                appDate,
                age,
                ageBucket: ageBucket(age, ageMode),
                isTarget: isTargetAge(age, targetAgeMin, targetAgeMax),
                enterpriseId,
                enterpriseLabel,
                kwSingle: keywordMatch.single,
                kwFull: keywordMatch.full,
                noteFirst
            };

            recordsAll.push(record);
            if (record.matched) recordsMatched.push(record);
        });

        return {
            settings,
            ageMode,
            ageCols: ageBuckets(ageMode),
            targetAgeMin,
            targetAgeMax,
            widths,
            keywordMaster,
            tagMaster,
            imageMap,
            indeedTagLimit,
            topImageLimit,
            enterpriseInfo,
            recordsAll,
            recordsMatched
        };
    }

    function category(label, sortValue = null) {
        return {
            label: s(label) || "（未設定）",
            sortValue
        };
    }

    function sortCrossGroups(groups, config) {
        if (config.sort === "fixed") {
            const orderMap = new Map(
                (config.order || []).map((label, index) => [label, index])
            );

            groups.sort((a, b) => {
                const ai = orderMap.has(a.label)
                    ? orderMap.get(a.label)
                    : 99999;
                const bi = orderMap.has(b.label)
                    ? orderMap.get(b.label)
                    : 99999;

                if (ai !== bi) return ai - bi;
                return a.label.localeCompare(b.label, "ja");
            });
            return;
        }

        if (config.sort === "numericAsc") {
            groups.sort((a, b) => {
                const av =
                    a.sortValue === null || a.sortValue === undefined
                        ? 999999999999
                        : Number(a.sortValue);
                const bv =
                    b.sortValue === null || b.sortValue === undefined
                        ? 999999999999
                        : Number(b.sortValue);

                if (av !== bv) return av - bv;
                return a.label.localeCompare(b.label, "ja");
            });
            return;
        }

        groups.sort((a, b) => {
            if (a.total !== b.total) return b.total - a.total;
            if (a.target !== b.target) return b.target - a.target;
            return a.label.localeCompare(b.label, "ja");
        });
    }

    function aggregateCross(records, categoryFn, context, config = {}) {
        const ageCols = context.ageCols;
        const groups = new Map();

        records.forEach(record => {
            let cat = categoryFn(record);

            if (cat === null || cat === undefined) {
                cat = category("（未設定）");
            } else if (typeof cat !== "object") {
                cat = category(cat);
            }

            const label = s(cat.label) || "（未設定）";

            if (!groups.has(label)) {
                groups.set(label, {
                    label,
                    sortValue:
                        cat.sortValue !== undefined
                            ? cat.sortValue
                            : null,
                    ageCounts: Object.fromEntries(
                        ageCols.map(age => [age, 0])
                    ),
                    total: 0,
                    target: 0
                });
            }

            const group = groups.get(label);
            group.total += 1;
            group.ageCounts[record.ageBucket] =
                (group.ageCounts[record.ageBucket] || 0) + 1;

            if (record.isTarget) {
                group.target += 1;
            }
        });

        const resultGroups = Array.from(groups.values());
        sortCrossGroups(resultGroups, config);

        const baseTarget = records.reduce(
            (sum, record) => sum + (record.isTarget ? 1 : 0),
            0
        );

        return {
            ageCols,
            groups: resultGroups,
            baseTotal: records.length,
            baseTarget
        };
    }

    function salaryDefinition(id, label, context, salaryType, width) {
        const records = context.recordsMatched.filter(record =>
            s(record.job?.["給与区分"]) === salaryType
        );

        return {
            id,
            label,
            baseLabel: `求人突合済応募（${salaryType}）`,
            records,
            sort: "numericAsc",
            conditionText: `バケット幅: ${numberLabel(width)}円`,
            categoryFn: record => {
                const value = n(record.job?.["給与金額MIN"]);

                if (value === null || value <= 0) {
                    return category("（給与下限なし）", 999999999999);
                }

                const start = Math.floor(value / width) * width;
                const end = start + width - 1;

                return category(
                    `${numberLabel(start)}-${numberLabel(end)}円`,
                    start
                );
            }
        };
    }

    function buildBasicTableDefinitions(context) {
        const all = context.recordsAll;
        const matched = context.recordsMatched;
        const w = context.widths;
        const definitions = [];

        definitions.push({
            id: "status",
            label: "対応状況別",
            baseLabel: "全応募",
            records: all,
            sort: "countDesc",
            categoryFn: record =>
                category(record.app["対応状況"] || "（未設定）")
        });

        definitions.push({
            id: "month",
            label: "応募月別",
            baseLabel: "全応募",
            records: all,
            sort: "numericAsc",
            categoryFn: record => {
                const label = s(record.app["応募年月"]) || "（不明）";
                return category(label, monthSortValue(label, record.appDate));
            }
        });

        definitions.push({
            id: "media",
            label: "応募媒体別",
            baseLabel: "全応募",
            records: all,
            sort: "countDesc",
            categoryFn: record =>
                category(record.app["応募媒体"] || "（未設定）")
        });

        if (context.enterpriseInfo.hasAnyDisplayName) {
            definitions.push({
                id: "enterprise",
                label: "企業ID別",
                baseLabel: "全応募",
                records: all,
                sort: "countDesc",
                categoryFn: record =>
                    category(record.enterpriseLabel || "（企業IDなし）")
            });
        }

        definitions.push({
            id: "name-script",
            label: "氏名文字種区分別",
            baseLabel: "全応募",
            records: all,
            sort: "fixed",
            order: ["漢字を含む", "漢字を含まない", "（不明）"],
            categoryFn: record =>
                category(record.app["氏名文字種区分"] || "（不明）")
        });

        definitions.push({
            id: "residence",
            label: "居住都道府県別",
            baseLabel: "全応募",
            records: all,
            sort: "countDesc",
            categoryFn: record =>
                category(record.app["居住都道府県"] || "（不明）")
        });

        definitions.push({
            id: "job-category",
            label: "職種別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "countDesc",
            categoryFn: record =>
                category(record.job?.["職種"] || "（未設定）")
        });

        definitions.push({
            id: "employment",
            label: "雇用形態別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "countDesc",
            categoryFn: record =>
                category(record.job?.["雇用形態"] || "（未設定）")
        });

        definitions.push({
            id: "job-location-name",
            label: "求人勤務地名称別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "countDesc",
            categoryFn: record =>
                category(record.job?.["求人勤務地名称"] || "（未設定）")
        });

        definitions.push({
            id: "job-prefecture",
            label: "勤務地都道府県別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "countDesc",
            categoryFn: record =>
                category(record.job?.["勤務地都道府県"] || "（未設定）")
        });

        definitions.push({
            id: "prefecture-match",
            label: "勤務地・居住都道府県一致別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "fixed",
            order: ["一致", "不一致", "（不明）"],
            categoryFn: record =>
                category(
                    yesNoMatchLabel(
                        record.app["勤務地・居住都道府県一致"]
                    )
                )
        });

        if (context.keywordMaster.length > 0) {
            definitions.push({
                id: "job-keyword",
                label: "仕事名KW別",
                baseLabel: "求人突合済応募",
                records: matched,
                sort: "countDesc",
                categoryFn: record =>
                    category(record.kwSingle || "（該当なし）")
            });

            definitions.push({
                id: "job-full-keyword",
                label: "仕事名フルKW別",
                baseLabel: "求人突合済応募",
                records: matched,
                sort: "countDesc",
                categoryFn: record =>
                    category(record.kwFull || "（該当なし）")
            });
        }

        definitions.push({
            id: "recruit-background",
            label: "募集背景別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "countDesc",
            categoryFn: record =>
                category(record.job?.["募集背景"] || "（未設定）")
        });

        definitions.push({
            id: "month-day",
            label: "月内応募日別",
            baseLabel: "全応募",
            records: all,
            sort: "numericAsc",
            conditionText: `バケット幅: ${w.monthDay}日`,
            categoryFn: record => {
                const value = n(record.app["応募日"]);

                if (value === null) {
                    return category("（不明）", 9999);
                }

                const rangeStart =
                    Math.floor((value - 1) / w.monthDay) *
                    w.monthDay +
                    1;

                const rangeEnd =
                    Math.min(rangeStart + w.monthDay - 1, 31);

                return category(
                    `${rangeStart}-${rangeEnd}日`,
                    rangeStart
                );
            }
        });

        definitions.push({
            id: "weekday",
            label: "応募曜日別",
            baseLabel: "全応募",
            records: all,
            sort: "fixed",
            order: ["月", "火", "水", "木", "金", "土", "日", "（不明）"],
            categoryFn: record =>
                category(record.app["応募曜日"] || "（不明）")
        });

        definitions.push({
            id: "hour",
            label: "応募時間帯別",
            baseLabel: "全応募",
            records: all,
            sort: "numericAsc",
            conditionText: `バケット幅: ${w.hour}時間`,
            categoryFn: record => {
                const value = n(record.app["応募時間帯"]);

                if (value === null) {
                    return category("（不明）", 9999);
                }

                const rangeStart =
                    Math.floor(value / w.hour) *
                    w.hour;

                const rangeEnd =
                    Math.min(rangeStart + w.hour - 1, 23);

                return category(
                    `${rangeStart}-${rangeEnd}時`,
                    rangeStart
                );
            }
        });

        definitions.push(
            salaryDefinition(
                "hourly-salary",
                "時給下限別",
                context,
                "時給",
                w.hourlySalary
            )
        );

        definitions.push(
            salaryDefinition(
                "daily-salary",
                "日給下限別",
                context,
                "日給",
                w.dailySalary
            )
        );

        definitions.push(
            salaryDefinition(
                "monthly-salary",
                "月給下限別",
                context,
                "月給",
                w.monthlySalary
            )
        );

        definitions.push(
            salaryDefinition(
                "annual-salary",
                "年収下限別",
                context,
                "年収",
                w.annualSalary
            )
        );

        definitions.push({
            id: "text-length",
            label: "求人原稿文字数別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "numericAsc",
            conditionText: `バケット幅: ${numberLabel(w.text)}文字`,
            categoryFn: record => {
                const value = n(record.job?.["求人原稿文字数"]);

                if (value === null) {
                    return category("（文字数なし）", 999999999);
                }

                const rangeStart =
                    Math.floor(value / w.text) *
                    w.text;

                const rangeEnd =
                    rangeStart + w.text - 1;

                return category(
                    `${numberLabel(rangeStart)}-${numberLabel(rangeEnd)}文字`,
                    rangeStart
                );
            }
        });

        definitions.push({
            id: "main-image",
            label: "メイン画像有無別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "fixed",
            order: ["あり", "なし"],
            categoryFn: record =>
                category(
                    s(record.job?.["メイン画像ファイル名"])
                        ? "あり"
                        : "なし"
                )
        });

        definitions.push({
            id: "image-count",
            label: "求人画像枚数別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "numericAsc",
            categoryFn: record => {
                let value = n(record.job?.["求人画像枚数"]);
                if (value === null) value = 0;
                return category(`${value}枚`, value);
            }
        });

        definitions.push({
            id: "job-video",
            label: "求人動画有無別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "fixed",
            order: ["あり", "なし"],
            categoryFn: record =>
                category(
                    truthy(record.job?.["求人動画あり"])
                        ? "あり"
                        : "なし"
                )
        });

        definitions.push({
            id: "indeed-tag-count",
            label: "Indeed求人タグ数別",
            baseLabel: "求人突合済応募",
            records: matched,
            sort: "numericAsc",
            conditionText: `バケット幅: ${w.tagCount}個`,
            categoryFn: record => {
                let value = n(record.job?.["Indeed求人タグ数"]);
                if (value === null) value = 0;

                const rangeStart =
                    Math.floor(value / w.tagCount) *
                    w.tagCount;

                const rangeEnd =
                    rangeStart + w.tagCount - 1;

                return category(
                    `${rangeStart}-${rangeEnd}個`,
                    rangeStart
                );
            }
        });

        return definitions;
    }

    function buildBasicCrossTables(context) {
        return buildBasicTableDefinitions(context)
            .filter(def => def.records.length > 0)
            .map(def => ({
                ...def,
                aggregate: aggregateCross(
                    def.records,
                    def.categoryFn,
                    context,
                    def
                )
            }));
    }


function aggregateNoteDetail(context) {
    const records = context.recordsMatched;

    const visible = records.some(
        record =>
            record.noteFirst &&
            record.noteFirst !== "（求人備考なし）"
    );

    if (!visible) {
        return {
            visible: false,
            aggregate: null
        };
    }

    return {
        visible: true,
        aggregate: aggregateCross(
            records,
            record =>
                category(
                    record.noteFirst ||
                    "（求人備考なし）"
                ),
            context,
            { sort: "countDesc" }
        )
    };
}

function emptyAgeCounts(ageCols) {
    return Object.fromEntries(
        ageCols.map(age => [age, 0])
    );
}

function accumulateMultiGroup(group, record) {
    group.total += 1;
    group.ageCounts[record.ageBucket] =
        (group.ageCounts[record.ageBucket] || 0) + 1;

    if (record.isTarget) group.target += 1;
    if (record.jobRefId) group.jobRefs.add(record.jobRefId);
}

function aggregateIndeedTags(context) {
    const ageCols = context.ageCols;
    const groups = new Map();
    let realTagExists = false;

    function ensureGroup(code, label, special = "") {
        const key = code || special;

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                code,
                label,
                special,
                ageCounts: emptyAgeCounts(ageCols),
                total: 0,
                target: 0,
                jobRefs: new Set()
            });
        }

        return groups.get(key);
    }

    context.recordsMatched.forEach(record => {
        const codes = splitCodes(
            record.job?.["Indeed求人タグコード"]
        );

        if (!codes.length) {
            const noTag = ensureGroup(
                "",
                "（タグなし）",
                "__NO_TAG__"
            );

            accumulateMultiGroup(noTag, record);
            return;
        }

        realTagExists = true;
        const seen = new Set();

        codes.forEach(code => {
            if (seen.has(code)) return;
            seen.add(code);

            const label =
                context.tagMaster[code] ||
                `${code}（名称未登録）`;

            const group = ensureGroup(
                code,
                label,
                ""
            );

            accumulateMultiGroup(group, record);
        });
    });

    if (!realTagExists) {
        return {
            visible: false,
            rows: [],
            baseTotal: context.recordsMatched.length,
            baseTarget: 0
        };
    }

    let noTagGroup = null;
    let realGroups = [];

    groups.forEach(group => {
        if (group.special === "__NO_TAG__") {
            noTagGroup = group;
        } else {
            realGroups.push(group);
        }
    });

    realGroups.sort((a, b) => {
        if (a.target !== b.target) return b.target - a.target;
        if (a.total !== b.total) return b.total - a.total;
        return a.label.localeCompare(b.label, "ja");
    });

    if (Number.isFinite(context.indeedTagLimit)) {
        realGroups = realGroups.slice(0, context.indeedTagLimit);
    }

    if (noTagGroup) realGroups.push(noTagGroup);

    const baseTotal = context.recordsMatched.length;
    const baseTarget = context.recordsMatched.reduce(
        (sum, record) => sum + (record.isTarget ? 1 : 0),
        0
    );

    return {
        visible: true,
        ageCols,
        baseTotal,
        baseTarget,
        displayLimit: context.indeedTagLimit,
        rows: realGroups.map(group => ({
            label: group.label,
            ageCounts: group.ageCounts,
            total: group.total,
            coverRate: baseTotal ? group.total / baseTotal : 0,
            target: group.target,
            targetRate: group.total ? group.target / group.total : 0,
            targetCoverRate: baseTarget ? group.target / baseTarget : 0,
            jobCount: group.jobRefs.size,
            appsPerJob:
                group.jobRefs.size
                    ? group.total / group.jobRefs.size
                    : 0
        }))
    };
}

function aggregateTopImages(context) {
    const ageCols = context.ageCols;
    const groups = new Map();
    let hasAnyImage = false;

    context.recordsMatched.forEach(record => {
        const fileName = s(
            record.job?.["メイン画像ファイル名"]
        );

        if (fileName) hasAnyImage = true;

        const key = fileName || "__NO_IMAGE__";

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                label: fileName || "（TOP画像なし）",
                fileName,
                noImage: !fileName,
                ageCounts: emptyAgeCounts(ageCols),
                total: 0,
                target: 0,
                jobRefs: new Set()
            });
        }

        const group = groups.get(key);
        group.total += 1;
        group.ageCounts[record.ageBucket] =
            (group.ageCounts[record.ageBucket] || 0) + 1;

        if (record.isTarget) group.target += 1;
        if (record.jobRefId) group.jobRefs.add(record.jobRefId);
    });

    if (!hasAnyImage) {
        return {
            visible: false,
            rows: [],
            baseTotal: context.recordsMatched.length,
            baseTarget: 0
        };
    }

    let noImageGroup = null;
    let realGroups = [];

    groups.forEach(group => {
        if (group.noImage) {
            noImageGroup = group;
        } else {
            realGroups.push(group);
        }
    });

    realGroups.sort((a, b) => {
        if (a.target !== b.target) return b.target - a.target;
        if (a.total !== b.total) return b.total - a.total;
        return a.label.localeCompare(b.label, "ja");
    });

    if (Number.isFinite(context.topImageLimit)) {
        realGroups = realGroups.slice(0, context.topImageLimit);
    }

    if (noImageGroup) realGroups.push(noImageGroup);

    const baseTotal = context.recordsMatched.length;
    const baseTarget = context.recordsMatched.reduce(
        (sum, record) => sum + (record.isTarget ? 1 : 0),
        0
    );

    return {
        visible: true,
        ageCols,
        baseTotal,
        baseTarget,
        displayLimit: context.topImageLimit,
        rows: realGroups.map(group => ({
            label: group.label,
            fileName: group.fileName,
            imageUrl:
                group.fileName
                    ? (context.imageMap[group.fileName] || "")
                    : "",
            ageCounts: group.ageCounts,
            total: group.total,
            share: baseTotal ? group.total / baseTotal : 0,
            target: group.target,
            targetRate: group.total ? group.target / group.total : 0,
            targetShare: baseTarget ? group.target / baseTarget : 0,
            jobCount: group.jobRefs.size,
            appsPerJob:
                group.jobRefs.size
                    ? group.total / group.jobRefs.size
                    : 0
        }))
    };
}

function customAxisOptions(context) {
    const options = [
        "対応状況",
        "応募年月",
        "応募媒体",
        "氏名文字種区分",
        "居住都道府県",
        "企業ID",
        "職種",
        "雇用形態",
        "求人勤務地名称",
        "勤務地都道府県",
        "勤務地・居住都道府県一致",
        "募集背景",
        "月内応募日",
        "応募曜日",
        "応募時間帯",
        "給与区分",
        "時給下限",
        "日給下限",
        "月給下限",
        "年収下限",
        "求人原稿文字数",
        "メイン画像有無",
        "求人画像枚数",
        "TOP画像ファイル名",
        "求人動画有無",
        "Indeed求人タグ数",
        "求人備考1行目"
    ];

    if (context.keywordMaster.length > 0) {
        options.splice(
            11,
            0,
            "仕事名KW",
            "仕事名フルKW"
        );
    }

    return options;
}

function customAxisRequiresJob(axis) {
    const appOnly = new Set([
        "対応状況",
        "応募年月",
        "応募媒体",
        "氏名文字種区分",
        "居住都道府県",
        "企業ID",
        "月内応募日",
        "応募曜日",
        "応募時間帯"
    ]);

    return !appOnly.has(axis);
}

function fixedSortValue(label, order) {
    const index = order.indexOf(label);
    return index >= 0 ? index : 99999;
}

function customSalaryValue(record, salaryType, width) {
    if (s(record.job?.["給与区分"]) !== salaryType) {
        return null;
    }

    const value = n(record.job?.["給与金額MIN"]);

    if (value === null || value <= 0) {
        return category("（給与下限なし）", 999999999999);
    }

    const start = Math.floor(value / width) * width;
    const end = start + width - 1;

    return category(
        `${numberLabel(start)}-${numberLabel(end)}円`,
        start
    );
}

function customAxisValue(record, axis, context) {
    const w = context.widths;

    if (axis === "対応状況") {
        return category(record.app["対応状況"] || "（未設定）");
    }

    if (axis === "応募年月") {
        const label = s(record.app["応募年月"]) || "（不明）";
        return category(
            label,
            monthSortValue(label, record.appDate)
        );
    }

    if (axis === "応募媒体") {
        return category(record.app["応募媒体"] || "（未設定）");
    }

    if (axis === "氏名文字種区分") {
        const label = record.app["氏名文字種区分"] || "（不明）";
        return category(
            label,
            fixedSortValue(
                label,
                ["漢字を含む", "漢字を含まない", "（不明）"]
            )
        );
    }

    if (axis === "居住都道府県") {
        return category(record.app["居住都道府県"] || "（不明）");
    }

    if (axis === "企業ID") {
        return category(
            record.enterpriseLabel ||
            record.enterpriseId ||
            "（企業IDなし）"
        );
    }

    if (axis === "月内応募日") {
        const value = n(record.app["応募日"]);

        if (value === null) return category("（不明）", 9999);

        const start =
            Math.floor((value - 1) / w.monthDay) *
            w.monthDay +
            1;

        const end = Math.min(start + w.monthDay - 1, 31);

        return category(`${start}-${end}日`, start);
    }

    if (axis === "応募曜日") {
        const label = record.app["応募曜日"] || "（不明）";

        return category(
            label,
            fixedSortValue(
                label,
                ["月", "火", "水", "木", "金", "土", "日", "（不明）"]
            )
        );
    }

    if (axis === "応募時間帯") {
        const value = n(record.app["応募時間帯"]);

        if (value === null) return category("（不明）", 9999);

        const start = Math.floor(value / w.hour) * w.hour;
        const end = Math.min(start + w.hour - 1, 23);

        return category(`${start}-${end}時`, start);
    }

    if (!record.matched) return null;

    if (axis === "職種") {
        return category(record.job?.["職種"] || "（未設定）");
    }

    if (axis === "雇用形態") {
        return category(record.job?.["雇用形態"] || "（未設定）");
    }

    if (axis === "求人勤務地名称") {
        return category(record.job?.["求人勤務地名称"] || "（未設定）");
    }

    if (axis === "勤務地都道府県") {
        return category(record.job?.["勤務地都道府県"] || "（未設定）");
    }

    if (axis === "勤務地・居住都道府県一致") {
        const label = yesNoMatchLabel(
            record.app["勤務地・居住都道府県一致"]
        );

        return category(
            label,
            fixedSortValue(
                label,
                ["一致", "不一致", "（不明）"]
            )
        );
    }

    if (axis === "仕事名KW") {
        return category(record.kwSingle || "（該当なし）");
    }

    if (axis === "仕事名フルKW") {
        return category(record.kwFull || "（該当なし）");
    }

    if (axis === "募集背景") {
        return category(record.job?.["募集背景"] || "（未設定）");
    }

    if (axis === "給与区分") {
        return category(record.job?.["給与区分"] || "（未設定）");
    }

    if (axis === "時給下限") {
        return customSalaryValue(record, "時給", w.hourlySalary);
    }

    if (axis === "日給下限") {
        return customSalaryValue(record, "日給", w.dailySalary);
    }

    if (axis === "月給下限") {
        return customSalaryValue(record, "月給", w.monthlySalary);
    }

    if (axis === "年収下限") {
        return customSalaryValue(record, "年収", w.annualSalary);
    }

    if (axis === "求人原稿文字数") {
        const value = n(record.job?.["求人原稿文字数"]);

        if (value === null) {
            return category("（文字数なし）", 999999999);
        }

        const start = Math.floor(value / w.text) * w.text;
        const end = start + w.text - 1;

        return category(
            `${numberLabel(start)}-${numberLabel(end)}文字`,
            start
        );
    }

    if (axis === "メイン画像有無") {
        const label =
            s(record.job?.["メイン画像ファイル名"])
                ? "あり"
                : "なし";

        return category(
            label,
            fixedSortValue(label, ["あり", "なし"])
        );
    }

    if (axis === "求人画像枚数") {
        let value = n(record.job?.["求人画像枚数"]);
        if (value === null) value = 0;
        return category(`${value}枚`, value);
    }

    if (axis === "TOP画像ファイル名") {
        return category(
            s(record.job?.["メイン画像ファイル名"]) ||
            "（TOP画像なし）"
        );
    }

    if (axis === "求人動画有無") {
        const label =
            truthy(record.job?.["求人動画あり"])
                ? "あり"
                : "なし";

        return category(
            label,
            fixedSortValue(label, ["あり", "なし"])
        );
    }

    if (axis === "Indeed求人タグ数") {
        let value = n(record.job?.["Indeed求人タグ数"]);
        if (value === null) value = 0;

        const start =
            Math.floor(value / w.tagCount) *
            w.tagCount;

        const end = start + w.tagCount - 1;

        return category(`${start}-${end}個`, start);
    }

    if (axis === "求人備考1行目") {
        return category(
            record.noteFirst || "（求人備考なし）"
        );
    }

    return null;
}

function sortCustomLabels(labels, metaMap, totalMap) {
    labels.sort((a, b) => {
        const am = metaMap.get(a) || {};
        const bm = metaMap.get(b) || {};

        const av = am.sortValue;
        const bv = bm.sortValue;

        const aHas =
            av !== null &&
            av !== undefined &&
            Number.isFinite(Number(av));

        const bHas =
            bv !== null &&
            bv !== undefined &&
            Number.isFinite(Number(bv));

        if (aHas && bHas && Number(av) !== Number(bv)) {
            return Number(av) - Number(bv);
        }

        if (aHas !== bHas) return aHas ? -1 : 1;

        const at = totalMap.get(a) || 0;
        const bt = totalMap.get(b) || 0;

        if (at !== bt) return bt - at;
        return a.localeCompare(b, "ja");
    });
}

function aggregateCustom(context, options = {}) {
    const rowAxis = s(options.rowAxis);
    const colAxis = s(options.colAxis);

    const ageFilterMode =
        s(options.ageFilterMode) === "指定範囲"
            ? "指定範囲"
            : "全年齢";

    const ageMin = n(options.ageMin);
    const ageMax = n(options.ageMax);

    if (!rowAxis || !colAxis) {
        return { ok: false, reason: "AXIS_REQUIRED" };
    }

    if (rowAxis === colAxis) {
        return { ok: false, reason: "SAME_AXIS" };
    }

    const requiresJob =
        customAxisRequiresJob(rowAxis) ||
        customAxisRequiresJob(colAxis);

    let base =
        requiresJob
            ? context.recordsMatched
            : context.recordsAll;

    if (ageFilterMode === "指定範囲") {
        base = base.filter(record => {
            if (record.age === null) return false;
            if (ageMin !== null && record.age < ageMin) return false;
            if (ageMax !== null && record.age > ageMax) return false;
            return true;
        });
    }

    const rowMeta = new Map();
    const colMeta = new Map();
    const matrix = new Map();
    const rowTotals = new Map();
    const colTotals = new Map();
    let usedRecords = 0;

    base.forEach(record => {
        const rowCat = customAxisValue(record, rowAxis, context);
        const colCat = customAxisValue(record, colAxis, context);

        if (!rowCat || !colCat) return;

        const rLabel = rowCat.label;
        const cLabel = colCat.label;

        if (!rowMeta.has(rLabel)) rowMeta.set(rLabel, rowCat);
        if (!colMeta.has(cLabel)) colMeta.set(cLabel, colCat);
        if (!matrix.has(rLabel)) matrix.set(rLabel, new Map());

        const rowMap = matrix.get(rLabel);

        rowMap.set(
            cLabel,
            (rowMap.get(cLabel) || 0) + 1
        );

        rowTotals.set(
            rLabel,
            (rowTotals.get(rLabel) || 0) + 1
        );

        colTotals.set(
            cLabel,
            (colTotals.get(cLabel) || 0) + 1
        );

        usedRecords += 1;
    });

    const rowLabels = Array.from(rowMeta.keys());
    const colLabels = Array.from(colMeta.keys());

    sortCustomLabels(rowLabels, rowMeta, rowTotals);
    sortCustomLabels(colLabels, colMeta, colTotals);

    if (colLabels.length > 100) {
        return {
            ok: false,
            reason: "TOO_MANY_COLUMNS",
            columnCount: colLabels.length
        };
    }

    if (!usedRecords) {
        return { ok: false, reason: "NO_DATA" };
    }

    return {
        ok: true,
        rowAxis,
        colAxis,
        ageFilterMode,
        ageMin,
        ageMax,
        rowLabels,
        colLabels,
        matrix,
        rowTotals,
        colTotals,
        applicationCount: usedRecords
    };
}

    function aggregateViewer(viewerResponse) {
        const context = buildViewerContext(viewerResponse);
        const records = context.recordsAll;

        const targetCount = records.reduce(
            (sum, record) => sum + (record.isTarget ? 1 : 0),
            0
        );

        const ageCountMap = Object.fromEntries(
            context.ageCols.map(label => [label, 0])
        );

        records.forEach(record => {
            ageCountMap[record.ageBucket] =
                (ageCountMap[record.ageBucket] || 0) + 1;
        });

        const ageRows = context.ageCols.map(label => ({
            label,
            count: ageCountMap[label] || 0,
            share: records.length
                ? (ageCountMap[label] || 0) / records.length
                : 0
        }));

        return {
            context,
            settings: context.settings,
            totalCount: records.length,
            targetCount,
            targetRate: records.length
                ? targetCount / records.length
                : 0,
            matchedCount: context.recordsMatched.length,
            matchedRate: records.length
                ? context.recordsMatched.length / records.length
                : 0,
            targetLabel: targetLabel(
                context.targetAgeMin,
                context.targetAgeMax
            ),
            ageMode: context.ageMode,
            ageRows,
            basicCrossTables: buildBasicCrossTables(context),
            noteDetail: aggregateNoteDetail(context),
            indeedTagDetail: aggregateIndeedTags(context),
            topImageDetail: aggregateTopImages(context),
            customAxisOptions: customAxisOptions(context)
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
        s,
        n,
        truthy,
        datasetObjects,
        parseDate,
        dateKey,
        ageBuckets,
        ageBucket,
        isTargetAge,
        targetLabel,
        readKeywordMaster,
        matchKeywords,
        buildViewerContext,
        aggregateCross,
        buildBasicCrossTables,
        aggregateNoteDetail,
        aggregateIndeedTags,
        aggregateTopImages,
        customAxisOptions,
        customAxisRequiresJob,
        customAxisValue,
        aggregateCustom,
        aggregateViewer,
        aggregateViewerMvp: aggregateViewer,
        formatNumber,
        formatPercent
    };
})(window);
