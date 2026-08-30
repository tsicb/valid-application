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

        const apps = datasetObjects(
            viewerResponse?.datasets?.applicationData || {}
        );

        const jobs = datasetObjects(
            viewerResponse?.datasets?.jobAnalysisMaster || {}
        );

        const keywordMaster = readKeywordMaster(
            viewerResponse?.datasets?.keywordMaster || {}
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
                kwFull: keywordMatch.full
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
            basicCrossTables: buildBasicCrossTables(context)
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
        aggregateViewer,
        aggregateViewerMvp: aggregateViewer,
        formatNumber,
        formatPercent
    };
})(window);
