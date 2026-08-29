# Viewer MVP v1 導入・確認手順

今回の目的は、既存のGoogle Sheetsレポートを残したまま、
Google Sheetを企業別データ保存場所として利用し、
企業向け閲覧専用Pagesからブラウザ集計できることを実証することです。

## 新しい経路

管理Pages
→ 中央API
→ 企業別Google Sheet
→ viewerToken
→ report.html
→ 中央API（read only）
→ ブラウザ集計

## GitHub Pagesへ置くファイル

- index.html
  - `index(20260830-viewer-mvp-manage-v1).html` をindex.htmlとして配置
- `report.html`
- `analysis-core.js`

## API GAS

`api_webapp_v1_8_viewer_mvp.txt`

へ全置換し、既存Web Appデプロイを新しいバージョンへ更新します。

## Template内GAS

`template_bound_report_v5.txt`

へ更新します。

MVP中は既存Sheetレポートも残すための互換版です。
将来的にはViewer移行完了後にbound GAS自体を撤去します。

## viewerToken

新規作成または既存Sheet更新時にAPIが長いランダムtokenを発行します。

99_内部状態:
- viewerToken
- viewerEnabled
- viewerBaseUrl
- manageBaseUrl

Script Properties:
- viewerTokenのSHA-256ハッシュ → spreadsheetId

企業向けURL:
`report.html#r=<viewerToken>`

`#`以降のfragmentを使うため、通常のHTTPリクエストやRefererへtokenが送信されにくい構成です。

またreport.htmlはMVPでは外部CDN・第三者JavaScriptを読み込みません。
tokenを読めるJavaScriptを自前の `analysis-core.js` とreport.html内だけに限定します。

## 閲覧API

企業向けPagesは社内ACCESS_KEYを使用しません。

POST:
```json
{
  "action": "viewerData",
  "viewerToken": "..."
}
```

API確認:
1. token hashがScript Propertiesに存在
2. 対象SheetがOUTPUT_FOLDER_ID直下
3. 有効応募分析Workbook
4. Sheet内viewerTokenと一致
5. viewerEnabledがTRUE

Viewerへ返す:
- metadata
- 30_集計設定
- 90_応募データ
- 91_求人分析マスタ
- 31_仕事名KWマスタ
- 32_画像マスタ
- 33_企業IDマスタ
- 95_コードマスタ
- 96_Indeed求人タグマスタ

返さない:
- 社内ACCESS_KEY
- viewerTokenそのもの
- 92_求人CSVスナップショット
- 93_処理情報
- 94_入力ファイル情報
- 99_内部状態の全内容

## Spreadsheetポータル

新規作成/更新後に

`00_このレポートについて`

を作ります。

ここから:
- 企業向け分析レポートを開く
- 社内用・分析管理ツールを開く

の2方向へ移動できます。

社内管理URL:
`index.html#sheet=<spreadsheetId>`

管理Pagesはhashを読み、既存レポートURL欄へ自動入力します。

## report.html MVP

まず以下だけ実装しています。

KPI:
- 分析対象応募数
- ターゲット応募数
- ターゲット率
- 求人データ突合率

分析:
- 年代構成
- 応募媒体別

30_集計設定の:
- 集計開始日
- 集計終了日
- ターゲット年齢下限
- ターゲット年齢上限
- 年齢区分

をブラウザ側で反映します。

Google Sheetsの集計結果セルは参照せず、
90_応募データをJavaScriptで直接再集計します。

## テスト手順

1. API GASをv1.8へ差し替え・再デプロイ
2. GitHub Pagesへ index.html / report.html / analysis-core.js を配置
3. Template bound GASをv5へ更新
4. 管理Pagesから新規作成、または既存Sheetを一度更新
5. 完了画面の「企業向けWebレポートを開く」をクリック
6. KPI・年代構成・応募媒体別を確認
7. 現行Sheetの同じ数値と一致するか確認
8. Sheetの `00_このレポートについて` からも閲覧Pagesが開くことを確認
9. 「社内用・分析管理ツールを開く」で管理Pagesの既存URL欄が自動入力されることを確認

## 次工程

MVPの数値一致を確認したら、
現在01/14/15/16で持っている分析項目を
`analysis-core.js` と `report.html` へ順次移植します。

Viewer側へ全分析を移植し終わってから、
Sheet側の分析表描画とbound GASを段階的に撤去します。
