---
name: perf-test-reference
description: k6 성능 테스트 레퍼런스. docker-compose 설정, 디렉토리 구조, thresholds.json, k6 스크립트 템플릿(smoke/load/stress), 실행 명령어, 결과 판정 기준 포함. /perf-test 실행 시 참조.
---

# k6 성능 테스트 레퍼런스

## docker-compose 설정

```yaml
k6:
  image: grafana/k6:latest
  container_name: xxx-k6
  volumes:
    - ./perf-test:/scripts
  network_mode: host
  profiles:
    - perf
```

## 디렉토리 구조

```
perf-test/
├── scripts/
│   ├── {도메인명}/
│   │   ├── create-{domain}.js
│   │   ├── get-{domain}.js
│   │   └── list-{domain}.js
│   └── common/
│       ├── auth.js
│       ├── config.js
│       └── checks.js
├── thresholds/
│   └── default.json
└── results/                   # gitignore
```

## thresholds/default.json

```json
{
  "thresholds": {
    "http_req_duration": { "p95": 500, "p99": 1000 },
    "http_req_failed": { "rate": 0.01 },
    "http_reqs": { "rate": 100 }
  },
  "stages": {
    "smoke": { "vus": 1, "duration": "10s" },
    "load": {
      "stages": [
        { "duration": "30s", "target": 50 },
        { "duration": "1m", "target": 50 },
        { "duration": "30s", "target": 0 }
      ]
    },
    "stress": {
      "stages": [
        { "duration": "30s", "target": 100 },
        { "duration": "1m", "target": 200 },
        { "duration": "30s", "target": 300 },
        { "duration": "1m", "target": 300 },
        { "duration": "30s", "target": 0 }
      ]
    }
  }
}
```

## 공통 스크립트

```javascript
// common/config.js
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};
```

```javascript
// common/checks.js
import { check } from 'k6';

export function checkResponse(res, expectedStatus = 200) {
  check(res, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'success is true': (r) => {
      try { return JSON.parse(r.body).success === true; }
      catch { return false; }
    },
  });
}
```

## API 테스트 스크립트 예시

```javascript
// scripts/order/create-order.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, defaultHeaders } from '../common/config.js';
import { checkResponse } from '../common/checks.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({ items: [{ productId: 1, quantity: 2 }] });
  const res = http.post(`${BASE_URL}/api/v1/orders`, payload, { headers: defaultHeaders });
  checkResponse(res, 200);
  sleep(1);
}
```

## 부하 테스트 (Mixed)

```javascript
// scripts/order/load-test-order.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, defaultHeaders } from '../common/config.js';
import { checkResponse } from '../common/checks.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  if (Math.random() < 0.7) {
    const id = Math.floor(Math.random() * 1000) + 1;
    const res = http.get(`${BASE_URL}/api/v1/orders/${id}`, { headers: defaultHeaders });
    checkResponse(res);
  } else {
    const payload = JSON.stringify({ items: [{ productId: 1, quantity: 1 }] });
    const res = http.post(`${BASE_URL}/api/v1/orders`, payload, { headers: defaultHeaders });
    checkResponse(res);
  }
  sleep(0.3);
}
```

## 실행 명령어

```bash
# Smoke Test
docker-compose run --rm k6 run /scripts/order/create-order.js

# Load Test
docker-compose run --rm k6 run /scripts/order/load-test-order.js

# 환경 변수 전달
docker-compose run --rm \
  -e BASE_URL=http://host.docker.internal:8080 \
  -e AUTH_TOKEN=test-token \
  k6 run /scripts/order/create-order.js

# 결과 JSON 저장
docker-compose run --rm k6 run \
  --out json=/scripts/../results/result.json \
  /scripts/order/create-order.js

# VU/Duration 오버라이드
docker-compose run --rm k6 run --vus 100 --duration 2m /scripts/order/create-order.js
```

## 결과 판정

| 지표 | PASS | WARN | FAIL |
|------|------|------|------|
| p95 응답시간 | < 500ms | 500ms - 1s | > 1s |
| p99 응답시간 | < 1s | 1s - 3s | > 3s |
| 에러율 | < 1% | 1% - 5% | > 5% |
| TPS | 목표 달성 | 목표 80% | 목표 80% 미달 |
