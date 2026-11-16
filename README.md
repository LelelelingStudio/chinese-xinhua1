# chdict

**公开、纯静态、可跨域调用的中文词典 JSON API。**

`chdict` 把成语、汉字、词语、歇后语数据预先生成成静态 JSON 文件，并发布到 Surge CDN。使用方无需部署后端、无需数据库、无需鉴权，直接通过 HTTP 读取即可。

> 本项目 is a fork of [pwxcoo/chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua)。  
> 原始仓库：[https://github.com/pwxcoo/chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua)  
> 当前仓库：[https://github.com/LelelelingStudio/chinese-xinhua1](https://github.com/LelelelingStudio/chinese-xinhua1)

---

## 在线地址

```text
https://chdict.leleleling.site
```

API 根路径：

```text
https://chdict.leleleling.site/api/v1
```

---

## 特点

- **纯静态**：没有服务器、没有数据库运行时、没有函数计算
- **公开读取**：通过根目录 `CORS` 文件返回 `Access-Control-Allow-Origin: *`
- **跨域可用**：任意网站、任意前端都可以直接 `fetch`
- **可缓存**：所有资源都是稳定 URL，适合浏览器和 CDN 缓存
- **可分片**：避免每次加载十几 MB 的全量文件
- **可版本化**：通过 `/api/v1/manifest.json` 获取版本、数据量和文件清单
- **无后端**：只需要把本仓库发布到 Surge

---

## 重要说明：这是静态 API

这不是动态搜索服务。

本项目**不会**提供这种接口：

```text
GET /api/v1/search?q=阿鼻
```

因为静态托管只会返回真实存在的静态文件。

正确用法是：

1. 读取轻量查询索引
2. 在浏览器本地过滤
3. 根据索引里的 `shard` 和 `offset` 读取对应分片
4. 从分片中取出完整记录

也就是说：**查询逻辑在使用方前端，本仓库只提供数据文件。**

---

## 数据集

当前生成结果以 `api/v1/manifest.json` 为准：

| 数据集 | 说明 | 条目数 |
| --- | --- | ---: |
| `idiom` | 成语 | 30,895 |
| `word` | 汉字 | 16,142 |
| `ci` | 词语 | 264,434 |
| `xiehouyu` | 歇后语 | 14,032 |

---

## API 文件结构

```text
api/v1/
  manifest.json
  raw/
    idiom.json
    word.json
    ci.json
    xiehouyu.json
  idiom/
    shards/
      a.json ... z.json
  word/
    shards/
      a.json ... z.json
  ci/
    shards/
      a.json ... z.json
  xiehouyu/
    shards/
      a.json ... z.json
    random-pool.json
  search/
    idiom-char-map.json
    word-char-map.json
    ci-char-map.json
    xiehouyu-char-map.json
    idiom-index-a.json ... idiom-index-z.json
    word-index-a.json  ... word-index-z.json
    ci-index-a.json    ... ci-index-z.json
    xiehouyu-index-a.json ... xiehouyu-index-z.json
```

---

## API 路径

| 路径 | 说明 |
| --- | --- |
| `/api/v1/manifest.json` | 版本、数据量、文件清单 |
| `/api/v1/raw/idiom.json` | 全量成语数据 |
| `/api/v1/raw/word.json` | 全量汉字数据 |
| `/api/v1/raw/ci.json` | 全量词语数据 |
| `/api/v1/raw/xiehouyu.json` | 全量歇后语数据 |
| `/api/v1/{dataset}/shards/{shard}.json` | 分片完整数据 |
| `/api/v1/search/{dataset}-index-{shard}.json` | 轻量查询索引 |
| `/api/v1/search/{dataset}-char-map.json` | 首字到分片映射 |
| `/api/v1/xiehouyu/random-pool.json` | 歇后语随机池 |

其中：

- `dataset` 可选：`idiom`、`word`、`ci`、`xiehouyu`
- `shard` 可选：`a` 到 `z`

---

## manifest.json 示例

```json
{
  "name": "chdict",
  "version": "1.0.0",
  "source": "https://github.com/pwxcoo/chinese-xinhua",
  "repository": "https://github.com/LelelelingStudio/chinese-xinhua1",
  "site": "https://chdict.leleleling.site",
  "cors": "*",
  "entryMode": "shard-offset",
  "datasets": {
    "idiom": {
      "count": 31648,
      "raw": "api/v1/raw/idiom.json",
      "shardPattern": "api/v1/idiom/shards/{shard}.json",
      "indexPattern": "api/v1/search/idiom-index-{shard}.json",
      "charMap": "api/v1/search/idiom-char-map.json"
    }
  }
}
```

---

## 查询索引格式

索引文件只保留查询所需字段：

```json
[
  {
    "id": "idiom-000001",
    "key": "阿鼻地狱",
    "shard": "a",
    "offset": 0,
    "pinyin": "ā bí dì yù",
    "pinyinAscii": "a bi di yu",
    "abbreviation": "abdy"
  }
]
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定 ID |
| `key` | 原始词条 |
| `shard` | 所在分片 |
| `offset` | 在分片数组中的下标 |
| `pinyin` | 原始拼音，可选 |
| `pinyinAscii` | 去掉声调的拼音，可选 |
| `abbreviation` | 拼音首字母，可选 |

---

## 快速开始

### 读取版本信息

```javascript
const BASE = 'https://chdict.leleleling.site/api/v1';

const manifest = await fetch(`${BASE}/manifest.json`).then((res) => res.json());

console.log(manifest.version);
console.log(manifest.datasets.idiom.count);
```

### 读取全量成语

```javascript
const idioms = await fetch(
  'https://chdict.leleleling.site/api/v1/raw/idiom.json'
).then((res) => res.json());
```

### 读取某个分片

```javascript
const shardA = await fetch(
  'https://chdict.leleleling.site/api/v1/idiom/shards/a.json'
).then((res) => res.json());
```

### 本地查询示例

```javascript
const SITE = 'https://chdict.leleleling.site';
const BASE = `${SITE}/api/v1`;

async function searchIdiom(keyword) {
  const manifest = await fetch(`${BASE}/manifest.json`).then((res) => res.json());
  const charMap = await fetch(
    `${SITE}/${manifest.datasets.idiom.charMap}`
  ).then((res) => res.json());

  const first = keyword.trim().charAt(0).toLowerCase();
  const shard = /[a-z]/.test(first)
    ? first
    : charMap[keyword.trim().charAt(0)];

  if (!shard) return [];

  const indexPath = manifest.datasets.idiom.indexPattern.replace('{shard}', shard);
  const index = await fetch(`${SITE}/${indexPath}`).then((res) => res.json());

  const hits = index.filter((item) => {
    const q = keyword.trim().toLowerCase();
    return (
      item.key.includes(keyword.trim()) ||
      item.pinyinAscii?.includes(q) ||
      item.abbreviation?.includes(q)
    );
  });

  const shardPath = manifest.datasets.idiom.shardPattern.replace('{shard}', shard);
  const data = await fetch(`${SITE}/${shardPath}`).then((res) => res.json());

  return hits.map((hit) => data[hit.offset]);
}
```

根目录 `index.html` 里有一个可直接运行的完整示例。

---

## CORS

Surge 通过项目根目录的 `CORS` 文件开启跨域访问。本仓库根目录的 `CORS` 文件内容为：

```text
*
```

因此所有静态资源都会返回：

```text
Access-Control-Allow-Origin: *
```

这意味着任何网站都可以直接读取这些 JSON 文件。

注意：

- CORS 对整个 Surge 项目生效，不能按子路径单独配置
- `CORS` 文件本身不会被公开访问
- CORS 在 Surge 所有套餐中免费

验证方式：

```bash
curl -I https://chdict.leleleling.site/api/v1/manifest.json | grep -i access-control
```

---

## 本地构建

原始数据位于 `data/`，原始抓取脚本位于 `scripts/`。

生成静态 API 文件：

```bash
npm run build
```

或：

```bash
node scripts/build-static-api.mjs
```

生成结果位于：

```text
api/v1/
```

---

## Surge 部署

本仓库发布根目录，也就是包含 `index.html`、`CNAME`、`CORS` 和 `api/` 的目录。

自动部署由 GitHub Actions 完成：

```text
.github/workflows/deploy.yml
```

Workflow 会在 `master` 分支 push 后执行：

```bash
surge . chdict.leleleling.site
```

所需 GitHub Secrets：

| Secret | 说明 |
| --- | --- |
| `SURGE_LOGIN` | Surge 注册邮箱 |
| `SURGE_TOKEN` | Surge 认证 Token |

仓库根目录的 `CNAME` 文件内容为：

```text
chdict.leleleling.site
```

仓库根目录的 `CORS` 文件内容为：

```text
*
```

HTTPS 由 Surge 自动配置并续期。

DNS 需要按 Surge 要求配置；当前域名 `chdict.leleleling.site` 是子域名，推荐添加：

```text
CNAME  chdict  geo.surge.world
```

---

## 限制

- 没有服务端搜索，查询逻辑需要在使用方本地完成
- 没有用户系统、鉴权、写入接口、限流
- 静态资源通过 Surge CDN 分发，带宽额度以 Surge 套餐为准
- Surge 具体套餐额度以官方说明为准
- 全量 JSON 文件较大，建议优先使用分片和索引
- CORS 对整个 Surge 项目生效，由根目录 `CORS` 文件统一控制

---

## 数据来源与声明

本仓库的数据来自上游项目 [pwxcoo/chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua)，由原作者从公开网络收集整理。

本 fork 仅供学习和一般查询使用，不对数据准确性、完整性或适用性作担保。

使用本项目数据时，请：

- 保留上游来源说明
- 遵守原数据及相关平台的使用条款
- 如发现侵权或错误，通过 Issue 反馈

上游 README 原声明：**本仓库无任何商业目的！如果有侵权行为将及时删除！**

---

## Star 支持

如果 `chdict` 对你有帮助，欢迎给仓库点个 Star：

[Star on GitHub](https://github.com/LelelelingStudio/chinese-xinhua1)

## Star History

<a href="https://www.star-history.com/?repos=lelelelingstudio%2Fchinese-xinhua1&type=date&legend=top-left">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=lelelelingstudio/chinese-xinhua1&type=date&theme=dark&legend=top-left" />
  <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=lelelelingstudio/chinese-xinhua1&type=date&legend=top-left" />
  <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=lelelelingstudio/chinese-xinhua1&type=date&legend=top-left" />
</picture>
</a>

---

## License

本项目沿用上游仓库的 [MIT License](./LICENSE)。
