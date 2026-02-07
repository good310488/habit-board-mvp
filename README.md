# Habit Board MVP

5人で共有できる「習慣ボード」のMVPです。ログイン必須の共有ボード方式で、各メンバーが自分の習慣を追加し、1習慣につき1つの記録ボタンを使います。

## セットアップ

1. Supabaseで新規プロジェクトを作成
2. SupabaseのSQL Editorで `supabase/schema.sql` を実行
3. SupabaseのAuth設定で「Email」を有効化（開発中は確認メールをOFF推奨）
4. SupabaseのProject URLとanon keyを `public/config.js` に設定
5. 依存関係をインストール
6. 開発サーバを起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 使い方

1. サインアップ / サインイン
2. 新しくボードを作成
3. 表示されたボードIDを友人に共有
4. 各自がボードIDで参加
5. 習慣を追加して記録
6. 習慣名はクリックで編集できます
7. 習慣はアーカイブ/削除できます（アーカイブは表示切替）
8. 自分の名前や色は「メンバー設定」で変更できます

## 注意点

- RLSを有効化しています。
- リアルタイム同期は未対応です。必要ならSyncボタンかリロードで反映してください。

## すでに旧スキーマで作成している場合

以下はデータが消えます。問題なければ実行してください。

```sql
drop table if exists entries;
drop table if exists habits;
drop table if exists members;
drop table if exists boards;
```

その後 `supabase/schema.sql` を再実行します。

今回の変更はテーブル構造が大きく変わっているため、原則は作り直し推奨です。

## 次の拡張候補

1. リアルタイム更新
2. streakや統計表示
