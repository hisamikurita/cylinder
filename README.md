# ArcLight Cylinder

Three.js で構築した円筒状ギャラリー表現。画像/動画を円周上に並べ、床面への鏡面反射・ボリュームライト・パララックスなどのビジュアルエフェクトを組み合わせている。

## Demo

<https://hisamikurita.github.io/arclight-cylinder/>

## 技術スタック

- [Three.js](https://threejs.org/) — WebGL レンダリング
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — 開発サーバ / ビルド
- [GSAP](https://gsap.com/) — アニメーション
- [lil-gui](https://lil-gui.georgealways.com/) — パラメータ調整 UI
- [Biome](https://biomejs.dev/) — Lint / Format

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev       # 開発サーバ起動
pnpm build     # 型チェック + プロダクションビルド (dist/ に出力)
pnpm preview   # ビルド結果のプレビュー
pnpm check     # Biome によるチェック
pnpm fix       # Biome による自動修正
```

## ディレクトリ構成

```
src/
├── app.ts                 # エントリポイント (メディア定義・初期化)
├── index.html             # HTML テンプレート (Vite root)
├── style.css
└── webgl/
    ├── index.ts           # webgl モジュールの再エクスポート
    ├── core.ts            # レンダラー / シーン / カメラ
    ├── Gallery.ts         # 円筒ギャラリー生成
    ├── galleryRotation.ts # 回転制御
    ├── geometry.ts
    ├── material.ts        # プレーン用マテリアル
    ├── lights.ts          # ライティング
    ├── reflection.ts      # 床面鏡面反射 (RenderTarget + Blur)
    ├── interactions.ts    # マウス/タッチ操作
    ├── gui.ts             # lil-gui によるデバッグ UI
    ├── constants.ts       # チューニング用パラメータ
    ├── helpers.ts
    └── shaders/           # GLSL (plane / blur / composite …)

public/                    # 静的アセット (favicon 等)
```

## デプロイ

`main` への push で GitHub Actions が GitHub Pages に自動デプロイする (`.github/workflows/deploy.yml`)。サブパス公開のため、ビルド時に `VITE_BASE=/<repo>/` を渡している。

ローカルでサブパス公開向けにビルドする場合:

```bash
VITE_BASE=/arclight-cylinder/ pnpm build
```
