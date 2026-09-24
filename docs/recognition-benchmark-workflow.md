# 実機認識ベンチマーク運用 v2

## 目的

認識調整を「この動画では動いた」で終わらせず、実機で確認した正例・見逃し・誤認候補を固定データとして蓄積し、変更前後を同じ条件で比較する。

runtime の8スクリプト構成は変更せず、テスト層だけで運用する。

## データの区分

- **calibration**: 調整に使用してよい実機動画。原因分析・閾値設計に利用する。
- **validation**: 調整には使用せず、候補修正が完了した後だけ確認する別動画。**現行pipelineを再実行できるraw fixture（lossless画像/ROI、画像SHA、video identity、frame identity）を伴う場合だけ** validation と呼ぶ。
- **safety**: 実データから想定された誤認条件を人工的に強調した負例。安全ガードの回帰用。
- **snapshot**: 過去Buildで取得したスコア・特徴量・decisionの保存値。ロジック回帰には使えるが、現行pipelineのE2E精度や別動画一般化の根拠にはしない。

同一動画だけで精度を上げ続けても、再実行可能なvalidationが0件なら「別動画でも精度が上がった」とは扱わない。

## 1件の不具合を直す標準手順

1. iPhone実機で認識結果を確認し、人間が「カードあり／なし」を確定する。
2. 診断JSONから、対象カードの同一スロットの連続フレーム、画像一致度、画像ソース、コストテンプレート、OCR結果を抜き出す。
3. `node tests/diagnostic-scenario-importer.mjs <診断JSON> --base <秒> --expected <cardId,cardId|none>` で実フレーム全候補を抽出する。`observed` は当時のアプリ判定、`expected` は人間が動画を見て確定した正解として分離する。
4. **コードを直す前に** 抽出したシナリオを `tests/recognition-benchmark-cases.json` へ追加する。人間ラベル未設定のシナリオは品質ゲートで拒否する。
5. 既存版で新ケースが期待どおりFAILすることを確認する。
6. candidateブランチで最小限の修正を行う。
7. `node tests/run-quality-gate.mjs` を実行し、既存回帰・runtime不変条件・抽出器回帰・実機ベンチマークを全PASSさせる。
8. false positive、false negative、全候補シナリオの認識集合差分が1件でも出た場合はmainへ入れない。
9. candidateとmainを比較し、behind 0を確認してからfast-forwardする。
10. mainを再取得し、品質ゲートを再実行する。
11. 次の別動画は可能な限りvalidationとして登録し、調整には使わず最終確認だけに使う。

## 精度調整のルール

- 1件の見逃しだけを理由に全カード共通閾値を下げない。
- 新しい救済条件には、必ず同じカードの負例を1件以上追加する。
- 正例だけ増やさず、境界に近い負例を同時に蓄積する。
- 「画像一致不足」「ドロー変形」「扇状配置」「コスト誤読」「ターン境界」「手札枚数変化」を別の失敗パターンとして記録する。
- 認識結果（カード集合・UNKNOWN/認識の境界）を固定する。decision経路は、その経路自体が安全条件である専用回帰だけで固定する。旧Buildのdecision名を通常ベンチマークで強制しない。
- historyObservedは現在手札の正解ラベルとして使用しない。

## データ量の目安

初期は各調整対象カードについて real positive 1件 + real negative 1件を最低条件とする。

次の段階では、1カードにつき以下を目標にする。

- calibration: 正例10以上 / 負例10以上
- validation: 正例5以上 / 負例5以上
- 可能なら2本以上の別動画からvalidationを取る

データが少ない間は「ベンチマークPASS」は回帰防止を意味し、一般的な実機精度を保証するものではない。

## 判定指標

ベンチマークはカード別に TP / FN / TN / FP を出す。

- **FN**: 本物を認識できない。再現率低下。
- **FP**: 本物でないものを認識する。安全上もっとも優先して防ぐ。
- seed段階では FP=0、FN=0 を品質ゲートとする。
- validationが増えた後は、カード別の再現率・適合率も比較する。

## 現在のseedデータ

clean-13.24で問題になったゼタ＆ベアトリクスと刹那のクイックブレイダーに加え、同じ実機診断からバルバロスの正例・負例も登録している。ターン境界のクイブレは、通常判定で先回りせず継続確認へ残すケースとして固定する。3カードすべてに過去のreal positive / real negative snapshotはある。ただしsnapshotだけをvalidation件数へ数えない。再実行可能なraw fixtureを段階的に追加する。

このファイルと `tests/recognition-benchmark-cases.json` はロジック回帰の基準にする。実動画精度のvalidation判定は、raw fixtureを現行pipelineで再実行した結果を別途必要とする。

## v2で追加した検証

- 単一カードだけでなく、同一フレーム内の全候補をまとめて再現する。
- 最終認識集合が完全一致することを確認する。余計なカード1枚でも認識した場合はFAIL。
- 診断当時のアプリ出力は `observed`、人間の正解は `expected` として分離する。
- `expected` の未設定シナリオはベンチマークへ採用しない。
- runtime 8本、fix-v非読込、Service Worker build/cache整合、current handとhistory分離、主要カードの候補閾値を自動確認する。
- 診断JSONからの転記は補助スクリプトで行い、手入力する値を最小化する。

現在のfull-frame calibrationでは、37.105秒はゼタ＆ベアトリクスのみ、82.395秒は刹那のクイックブレイダー＋バルバロスのみを正解集合として固定している。

## 人間確認の優先キュー

実機診断の全場面を最初から目視するのではなく、次のコマンドで「人間が先に確認すべき場面」を順位付けする。

`node tests/diagnostic-review-queue.mjs <診断JSON>`

このキューは正解ラベルを自動決定しない。出力される `recommendedAction` は常に `human-label` であり、動画を見て `expected` を確定する前の候補選定だけを行う。

優先度は、候補閾値への近さ、同一スロットでの安定、アンカー一致、OCRと許容コストの競合、コストテンプレートの反復支持などを組み合わせる。認識済みカードは既定では除外する。

運用順序は以下とする。

1. 診断JSONをreview queueへ通す。
2. priorityの高い場面から動画を目視する。
3. 人間がカードの有無を確定する。
4. diagnostic scenario importerで全候補を抽出し、明示した人間ラベルを `expected` に入れる。
5. calibrationまたはvalidationへ登録する。
6. 品質ゲートを実行する。

これにより、診断全体の大量の通常場面ではなく「閾値近傍・安定した未解決・コスト競合」から先にラベルを増やせる。

## validation動画のfalse positive確認

validation動画では、未解決候補だけでなく、**認識済みカードも必ず人間確認対象**にする。

`node tests/diagnostic-review-queue.mjs <診断JSON> --validation`

validationモードでは次を確認対象へ出す。

- 認識済みカード：false positive確認のため必須
- 救済経路で認識したカード：優先度を上げる
- candidate threshold未満から救済されたカード：さらに優先度を上げる
- 従来どおりの高優先未解決候補：false negative確認のため残す

診断に候補フレーム詳細が欠けていても、認識結果自体が残っていればvalidation確認対象から落とさない。

人間が動画で確認するまでは `observed` を `expected` に昇格しない。

## 証拠の再現性ルール（2026-09-24追記）

- ファイル名＋時刻だけでは動画identityを確定しない。最低でもsource動画のSHA-256、size、duration、解像度を保持する。
- frame単位の証拠はframeIndex/mediaTimeとlossless frame/ROI hashを保持する。
- scoreだけを保存したreal-video snapshotはQuality Gateへ残してよいが、`validation`や一般化の根拠には数えない。
- raw fixtureが保存されていない過去ケースで現行動画と矛盾した場合、値を書き換えて整合させず、invalidated evidenceとして履歴を残す。
- `captureHandFixtureBundle()` のlossless PNG・SHA・geometry情報を新しい再現可能fixtureの標準入口とする。
