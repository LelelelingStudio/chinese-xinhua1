import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const API_DIR = path.join(ROOT, 'api', 'v1');
const SHARDS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const VERSION = '1.0.0';
const SOURCE = 'https://github.com/pwxcoo/chinese-xinhua';
const REPOSITORY = 'https://github.com/LelelelingStudio/chinese-xinhua1';
const SITE = 'https://chdict.leleleling.site';

const DATASETS = [
  {
    key: 'idiom',
    file: 'idiom.json',
    keyField: 'word',
    pinyinField: 'pinyin',
    abbreviationField: 'abbreviation'
  },
  {
    key: 'word',
    file: 'word.json',
    keyField: 'word',
    pinyinField: 'pinyin'
  },
  {
    key: 'ci',
    file: 'ci.json',
    keyField: 'ci'
  },
  {
    key: 'xiehouyu',
    file: 'xiehouyu.json',
    keyField: 'riddle'
  }
];

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(relativePath, value) {
  const filePath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function asciiInitial(value) {
  const normalized = normalizeText(value);
  const match = normalized.match(/[a-z]/);
  return match ? match[0] : null;
}

function codepointShard(value) {
  const text = String(value ?? '');
  const codePoint = text.codePointAt(0) ?? 0;
  return SHARDS[codePoint % SHARDS.length];
}

function shardFor(record, definition, key) {
  if (definition.abbreviationField) {
    const fromAbbreviation = asciiInitial(record[definition.abbreviationField]);
    if (fromAbbreviation) return fromAbbreviation;
  }

  if (definition.pinyinField) {
    const fromPinyin = asciiInitial(record[definition.pinyinField]);
    if (fromPinyin) return fromPinyin;
  }

  return codepointShard(key);
}

function makeIndexEntry(record, definition, id, shard, offset, key) {
  const entry = {
    id,
    key,
    shard,
    offset
  };

  if (definition.pinyinField && record[definition.pinyinField]) {
    entry.pinyin = record[definition.pinyinField];
    entry.pinyinAscii = normalizeText(record[definition.pinyinField]);
  }

  if (definition.abbreviationField && record[definition.abbreviationField]) {
    entry.abbreviation = normalizeText(record[definition.abbreviationField]);
  }

  return entry;
}

function buildDataset(definition) {
  const records = readJson(definition.file);

  if (!Array.isArray(records)) {
    throw new Error(`${definition.file} must contain a JSON array`);
  }

  const shardBuckets = Object.fromEntries(SHARDS.map((shard) => [shard, []]));
  const indexBuckets = Object.fromEntries(SHARDS.map((shard) => [shard, []]));
  const charMap = {};
  const randomPool = [];

  records.forEach((record, index) => {
    const key = String(record[definition.keyField] ?? '').trim();
    const id = `${definition.key}-${String(index + 1).padStart(6, '0')}`;
    const shard = shardFor(record, definition, key);
    const offset = shardBuckets[shard].length;

    shardBuckets[shard].push(record);
    indexBuckets[shard].push(
      makeIndexEntry(record, definition, id, shard, offset, key)
    );

    const firstChar = key.charAt(0);
    if (firstChar && !charMap[firstChar]) {
      charMap[firstChar] = shard;
    }

    if (definition.key === 'xiehouyu') {
      randomPool.push({ id, shard, offset });
    }
  });

  writeJson(`api/v1/raw/${definition.key}.json`, records);

  for (const shard of SHARDS) {
    writeJson(
      `api/v1/${definition.key}/shards/${shard}.json`,
      shardBuckets[shard]
    );
    writeJson(
      `api/v1/search/${definition.key}-index-${shard}.json`,
      indexBuckets[shard]
    );
  }

  writeJson(`api/v1/search/${definition.key}-char-map.json`, charMap);

  if (definition.key === 'xiehouyu') {
    writeJson('api/v1/xiehouyu/random-pool.json', randomPool);
  }

  return {
    count: records.length,
    raw: `api/v1/raw/${definition.key}.json`,
    shardPattern: `api/v1/${definition.key}/shards/{shard}.json`,
    indexPattern: `api/v1/search/${definition.key}-index-{shard}.json`,
    charMap: `api/v1/search/${definition.key}-char-map.json`,
    ...(definition.key === 'xiehouyu'
      ? { randomPool: 'api/v1/xiehouyu/random-pool.json' }
      : {})
  };
}

function build() {
  fs.rmSync(API_DIR, { recursive: true, force: true });
  fs.mkdirSync(API_DIR, { recursive: true });

  const datasets = {};

  for (const definition of DATASETS) {
    datasets[definition.key] = buildDataset(definition);
    console.log(`${definition.key}: ${datasets[definition.key].count}`);
  }

  const manifest = {
    name: 'chdict',
    version: VERSION,
    source: SOURCE,
    repository: REPOSITORY,
    site: SITE,
    cors: '*',
    generatedAt: new Date().toISOString(),
    description: 'Public static Chinese dictionary JSON API. No backend required.',
    entryMode: 'shard-offset',
    datasets
  };

  writeJson('api/v1/manifest.json', manifest);
  console.log('Static API generated at api/v1/');
}

build();
