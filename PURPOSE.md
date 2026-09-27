# Shadowverse: Worlds Beyond Replay Reviewer — Purpose Boundary

基準: v4.13.82 / 2026-09-27

## 1. 中核目的

このアプリの中核は、録画済みリプレイから観測できる情報を安全に抽出し、試合後の振り返りを支援すること。

本体フローは次に固定する。

1. リプレイ動画を読み込む。
2. ターン、マリガン、クラスを認識する。
3. HP / PP / Extra PP / EP / SEP / 守護 / 現在手札 / 盤面打点を、確認できた範囲だけ状態として保存する。
4. 同一ターン内の複数の安定観測点から Action Timeline を構成する。
5. 因果を断定せず、観測した状態変化を observed episode としてまとめる。
6. 大きなHP変化、資源変化、盤面変化、守護変化などを ReviewPoint として抽出する。
7. ユーザーが保存した局面・メモと合わせて振り返りに使う。

## 2. 絶対に守る認識境界

- 未確認は 0 / なし に変換しない。
- UNKNOWN と known の遷移だけから状態変化を作らない。
- 3秒を超える観測空白から詳細Actionを推定しない。
- 手札差分だけから card-play を確定しない。
- PP減少とHP減少が同一区間でも、同一カード・同一行動・効果源・行動順を断定しない。
- historyObserved は現在手札へ混ぜない。
- ReviewEngine は historyObserved を根拠にしない。
- diagnostic-only / shadow-only の結果を production 判定へ自動昇格しない。
- false CONFIRMED の防止を recall より優先する。

## 3. ドメイン境界

### A. Observation Core — 本体

対象:
- app-core
- turn-recognition
- mulligan-class
- hand-recognition の production 判定
- state-recognition
- replay-session の states / actions / observedEpisodes / observation由来ReviewPoint

役割:
録画から直接または安全な短時間差分として確認できた事実だけを扱う。

### B. Tactical Review — 補助

対象:
- card-db の戦術カタログ
- review-engine
- 保存リーサル状態

役割:
観測済み状態またはユーザー入力を材料に、選択された戦術プロファイル内で既知ルートを評価する。

制約:
- デフォルトは reviewProfile=none。
- 戦術評価結果は観測事実そのものとして扱わない。
- 未確認情報があれば「リーサルなし」を断定しない。

### C. Counterfactual Simulation — 補助

対象:
- counterfactual-review

役割:
保存された判断時点の状態を独立コピーし、手入力した別展開を評価する。

制約:
- Action Timeline の観測事実へ混ぜない。
- 親状態を変更しない。
- knowledgeCutoffSeconds を引き継ぐ。
- 後から得た公開情報を自動遮断できるとは表現しない。

### D. Diagnostics / Research — 開発専用

対象:
- diagnostics
- hand-recognition 内の diagnostic-only probe
- recognition-v5 shadow / dataset / benchmark 系

役割:
認識精度の検証と原因分析。

制約:
- 通常利用の主導線にしない。
- production の確定判定へ直接接続しない。
- fixture / deep diagnostics はユーザーが明示的に実行した場合だけ取得する。

## 4. 非目的

次をアプリ本体の目的にはしない。

- リアルタイム対戦中の自動操作。
- 未観測のカード使用や行動順の断定。
- 完全なゲーム状態復元。
- あらゆるデッキの万能リーサル探索。
- 反実仮想結果を「実戦で起きた事実」として扱うこと。
- benchmark PASS だけで未知動画への一般化を保証すること。

## 5. 追加機能の採用条件

新機能は少なくとも次のいずれかを満たすこと。

- 観測精度または false CONFIRMED 防止を改善する。
- 振り返り候補の抽出精度を改善する。
- 同じ精度を維持して解析時間・操作量を減らす。
- ユーザーが判断時点を理解するための情報を明確にする。

上記に該当しない戦術シミュレーション、研究用プローブ、データ収集機能は、本体へ直接混ぜず別モジュールまたは診断専用領域へ置く。

## 6. 変更時の回帰基準

変更後は最低限、以下を確認する。

- module version / runtime invariant
- turn / mulligan / class
- state unknown safety
- hand recognition safety invariants
- ReplaySession states / actions / observedEpisodes
- ReviewPoint
- tactical review profile boundary
- counterfactual independent-state boundary
- diagnostics / fixture isolation
- main と candidate の差分
- GitHub Actions Quality Gate

正式基準は保存・再読込・回帰確認を満たした版だけとする。
