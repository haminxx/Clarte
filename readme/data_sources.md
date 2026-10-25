# PABER 데이터 소스 인벤토리 (특허 · 논문 · 우주 데이터)

조사 시각: 2026-10-25 오후 2:37~2:45 PT. 아래 "오늘 상태"는 이 박스에서 예시 엔드포인트를 직접 `curl` 해서 받은 HTTP 코드다. 429는 서버는 살아 있지만 요청 한도에 걸린 것이고, 401/403은 키나 등록이 필요하다는 뜻이다. 한도와 약관은 공식 문서에서 확인한 것만 적었고, 확인하지 못한 항목은 "not stated"로 표시했다.

수집 원칙은 공식 API만 쓰고 웹 스크래핑은 하지 않는 것이다. 수집한 데이터는 DB(팀 기본안은 Cloudflare D1 + Vectorize, 대안은 Supabase Postgres + pgvector)에 넣고 MCP 서버로 열며, 요약과 태깅은 Gemma 4(Gemini API), 대화는 Grok Voice가 맡는다. 레코드마다 `source`, `source_url`, `license_note`를 꼭 저장한다.

## 1. 특허 (Patents)

| Name | Contents | Example endpoint | Key needed | Free limits | Status today | Notes |
|---|---|---|---|---|---|---|
| NASA T2 Patents | 라이선스 가능한 NASA 특허(TOPS), 분야, 센터, 이미지 | `https://technology.nasa.gov/api/api/patent/battery` | 없음 | not stated | **200** | 응답이 배열 형태(`[id, case no, title, abstract, ..., category, center, image]`). 검색어당 결과 수 예: space 361, thermal 132, propulsion 66. 제목과 초록에 `<span class="highlight">` 태그가 섞여 있어서 제거해야 함 |
| NASA T2 Software | NASA 공개 소프트웨어 카탈로그 | `https://technology.nasa.gov/api/api/software/thermal` | 없음 | not stated | **200** | space 193건, thermal 35건 |
| NASA T2 Spinoff | 우주 기술이 지구 산업에 적용된 사례 | `https://technology.nasa.gov/api/api/spinoff/battery` | 없음 | not stated | **200** | space는 1000건(상한으로 보임). "다른 분야에 적용" 스토리에 가장 잘 맞음 |
| USPTO Open Data Portal (ODP) | 미국 특허 출원·등록 메타데이터, File Wrapper, Bulk 데이터(PatentsView 테이블 포함) | `https://api.uspto.gov/api/v1/patent/applications/search?q=battery` (헤더 `X-API-KEY`) | **필요**: USPTO.gov 계정 + **ID.me 신원 인증** 후 "Manage API Key"에서 발급. 2026-08-18부터 프로필 추가 항목 4개 필수 | 메타데이터 API 주당 500만 콜, Documents API 주당 120만 콜, 키당 동시 요청 1개, 초당 4~15건, 429 후 최소 5초 대기 | **401** | ID.me 인증 시간 때문에 해커톤 당일에는 비현실적. 미국 정부 데이터라 재사용은 비교적 자유로우나 ODP 이용약관 준수 |
| USPTO PatentsView (legacy / PatentSearch) | 정제된 미국 특허 데이터 | `https://api.patentsview.org/...` → 301, `https://search.patentsview.org/api/v1/patent/` | 기존 키는 ODP와 호환 안 됨 | 해당 없음 | **301 / 응답 없음** | 2026-03-20부터 ODP로 이전 중. 공식 안내상 PatentSearch API는 일시 중단, 재개 일정 없음. 데이터는 ODP Bulk Datasets(`pvgpatdis` 등)로만 받을 수 있음 |
| EPO Open Patent Services (OPS) | 유럽 및 전 세계 서지·법적상태·전문(Espacenet과 같은 소스), CPC | `https://ops.epo.org/3.2/rest-services/published-data/search?q=battery` | **필요**: 무료 등록 후 앱을 만들고 OAuth 토큰 사용 | 무료 사용자 주당 4 GB까지 (초과 시 연 EUR 2,800) | **403** | 키 없이 부르면 Fair Use 위반으로 거절. Fair use charter와 OPS 약관 준수. XML 응답 |
| Lens.org API | 특허와 학술 문헌 통합 검색 | `POST https://api.lens.org/patent/search` | **필요**: Lens 계정 → Trial 신청 → **수동 승인** → 토큰 | Trial은 승인일부터 14일, 비상업 평가용만. 구체적 수치 not stated(API & Data 페이지에 표시) | **401** | 승인 대기 때문에 오늘은 비추천. 계속 쓰려면 기관 구독이 필요 |
| WIPO PATENTSCOPE | PCT 국제출원과 각국 특허 컬렉션 | 웹 검색만 무료: `https://patentscope.wipo.int/search/en/search.jsf` | API는 **유료** (SOAP 웹서비스 연 CHF 600 / 2,000) | 무료 웹은 분당 10회 초과 검색을 과도한 사용으로 볼 수 있음 | 웹 **200** | 무료 웹에서 자동 질의, 대량 다운로드, 스크래핑은 약관상 금지. **PABER 수집 대상에서 제외** |
| Google Patents Public Datasets (BigQuery) | 전 세계 특허 서지와 전문 (`patents-public-data.patents.publications`) | BigQuery SQL (콘솔: `console.cloud.google.com/marketplace/product/google_patents_public_datasets/...`) | **필요**: Google Cloud 프로젝트 (BigQuery sandbox 가능) | BigQuery 무료 티어 월 1 TiB 쿼리 처리 (BigQuery 가격 정책). 테이블이 커서 컬럼과 조건을 좁히지 않으면 한도를 빨리 씀 | 콘솔 페이지 **200**, 쿼리는 미테스트 | 대량 확장 단계용. 오늘은 제외 |

## 2. 논문 · 기술 보고서 (Papers / Reports)

| Name | Contents | Example endpoint | Key needed | Free limits | Status today | Notes |
|---|---|---|---|---|---|---|
| NASA NTRS | NASA 기술 보고서, 학회 논문, 초록, PDF 링크 | `https://ntrs.nasa.gov/api/citations/search?q=thermal%20control&page.size=100` | 없음 | not stated | **200** | "battery cooling" 59건, "thermal control" 5,987건. 레코드마다 `copyright`, `exportControl`, `distribution` 필드가 있으니 `distribution=PUBLIC`만 저장 |
| arXiv API | 물리, 천체물리(astro-ph), 우주물리(physics.space-ph), CS, q-bio 등 프리프린트 | `https://export.arxiv.org/api/query?search_query=cat:astro-ph.IM+AND+all:spacecraft&max_results=100` | 없음 | 3초에 1회, 연결 1개 (legacy API 이용약관) | **200** | `https` 필수. 메타데이터는 CC0로 저장·공유 가능. 본문은 논문별 라이선스 |
| OpenAlex | 전 분야 논문, 저자, 기관, 개념 (2억 건 이상) | `https://api.openalex.org/works?search=spacecraft&per-page=100` | 무키 가능하지만 **무료 키 권장** (계정 생성, 또는 이메일로 키 요청 후 메일 링크 클릭) | 무키: 초당 10회 + IP 공유 일일 예산. 무료 키: 일일 예산 10배($1/일), 초당 30회, cursor 페이징은 키 필요. UTC 자정(PT 오후 5시) 리셋 | 첫 호출 200, 직후 **429** (무키 일일 예산 소진) | 데이터는 CC0. "모든 분야" 비전의 핵심 소스 |
| Semantic Scholar | 전 분야 논문, 인용, TLDR, SPECTER 임베딩 | `https://api.semanticscholar.org/graph/v1/paper/search?query=spacecraft&limit=1` | 대부분 무키 가능, 일부 엔드포인트와 높은 한도는 키 필요 (신청 폼) | 무키는 모든 무인증 사용자가 공유하는 초당 1,000건, 혼잡 시 추가 제한 | **429** | API License Agreement 준수. 키는 승인이 필요해서 오늘은 보조용 |
| Europe PMC | 바이오·의학 논문, 초록, 오픈액세스 전문 | `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=spacecraft&format=json&pageSize=100` | 없음 | not stated | **200** | "spacecraft" 14,014건. 초록 저작권은 출판사에 있을 수 있음. OA 전문은 논문별 라이선스 |
| PubMed E-utilities | 생의학 논문 메타데이터와 초록 | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=crispr&retmode=json` | 무키 가능. NCBI 계정 → Account settings → API Key Management로 무료 키 | 무키 초당 3회, 키 사용 시 초당 10회 | **200** | "crispr" 72,090건. 일부 초록은 저작권 보호 대상 |
| Crossref REST API | 전 분야 DOI 메타데이터 (제목, 저자, 저널, 일부 초록) | `https://api.crossref.org/works?query=spacecraft&rows=100&mailto=YOUR_EMAIL` | 없음 (`mailto`를 붙이면 polite pool) | 수치 not stated. 429가 오면 백오프하라고 안내 | **200** | DOI 보강과 중복 제거용으로 좋음 |
| CORE | 오픈액세스 논문 메타데이터와 전문 | `https://api.core.ac.uk/v3/search/works/?q=spacecraft&limit=1` | 무키 가능, 무료 등록 시 한도 증가 | 무키: 하루 100 토큰, 분당 최대 10. 개인 등록: 하루 1,000 토큰, 분당 25. 단순 질의 1토큰, 복잡한 질의 3~5토큰 | **200** (끝에 `/`가 없으면 301) | 팀원 확인 때는 한도에 걸렸음. 무키 한도가 작아서 대량 수집에는 등록 필요 |
| DOAJ | 오픈액세스 저널 논문 메타데이터 | `https://doaj.org/api/search/articles/spacecraft?pageSize=1` | 없음 | not stated | **200** | OA 저널만 다룸 |
| NASA ADS | 천체물리·행성과학·우주과학 문헌 | `https://api.adsabs.harvard.edu/v1/search/query?q=spacecraft` (헤더 `Authorization: Bearer <token>`) | **필요**: ADS 계정 → Settings → API Token | 엔드포인트별 일일 한도, 예시로 하루 5,000 질의 (응답 헤더 `X-RateLimit-*`) | **401** | 우주 논문으로는 가장 좋은 소스. 토큰은 즉시 발급이라 시간이 되면 추가 추천 |

## 3. 우주 데이터 (테마용 Space data)

| Name | Contents | Example endpoint | Key needed | Free limits | Status today | Notes |
|---|---|---|---|---|---|---|
| CelesTrak GP | 위성 궤도 요소 (ISS, Starlink 등) | `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json` | 없음 | 데이터는 2시간마다 갱신. 같은 파일을 반복 다운로드하면 IP 임시 차단(403) | **200** | 반드시 캐시할 것. 403/404를 받으면 재시도하지 말고 멈춤 |
| Launch Library 2 (The Space Devs) | 과거·예정 발사, 로켓, 미션, 발사장, 우주인 | `https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=1` | 없음 | 무인증 시간당 15회. 더 필요하면 Patreon | **200** | 개발 중에는 `lldev.thespacedevs.com`(200, 데이터가 오래됐을 수 있음)을 써서 본 서버 한도 아끼기 |
| NASA Open APIs (api.nasa.gov) | APOD, NeoWs(소행성), DONKI(우주기상), EPIC 등 | `https://api.nasa.gov/neo/rest/v1/feed?api_key=DEMO_KEY` | `DEMO_KEY`로 가능. 개인 키는 api.nasa.gov에서 이메일로 즉시 무료 발급 | DEMO_KEY: IP당 시간 30회, 하루 50회. 개인 키: 시간당 1,000회 | NeoWs **200**, APOD **500**, DONKI **503** | 오늘 APOD와 DONKI는 업스트림 장애. 데모의 핵심 경로에는 넣지 말 것 |
| NASA Image and Video Library | 미션 사진과 영상 메타데이터 | `https://images-api.nasa.gov/search?q=apollo&media_type=image` | 없음 | not stated | **200** | UI 장식과 노드 썸네일용. NASA 미디어 이용 가이드라인 준수 |
| data.nasa.gov 카탈로그 | NASA 공개 데이터셋 목록 (DCAT JSON) | `https://data.nasa.gov/data.json` | 없음 | not stated | **200** | "어떤 데이터셋이 있나" 노드로 쓸 수 있음 |
| Spaceflight News API | 우주 뉴스 기사 | `https://api.spaceflightnewsapi.net/v4/articles/?limit=1` | 없음 | not stated | **200** | 시장조사·토론 단계의 "최근 동향" 근거로 쓸 수 있음 |
| ESA Gaia Archive (TAP) | Gaia 별 카탈로그 | `https://gea.esac.esa.int/tap-server/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY=SELECT+TOP+1+source_id+FROM+gaiadr3.gaia_source` | 없음 (익명 질의 가능) | not stated | **200** | PABER의 기술 그래프와는 거리가 있음. 선택 사항 |
| ESA DISCOS | 우주 물체·우주 쓰레기 DB | `https://discosweb.esoc.esa.int/api/objects` | **필요**: ESA 계정과 토큰 | not stated | **401** | 오늘은 제외 |

## 4. 해커톤 수집 우선순위 (다음 약 3시간, 총 500~800건, 우주 중심, 특허 비중 높게)

시드 키워드 12개를 공통으로 쓴다: thermal control, battery, propulsion, composite materials, sensors, robotics, communications, life support, imaging, power systems, cryogenics, water purification.

| 순서 | 소스 | 목표 건수 | 이유 |
|---|---|---|---|
| 1 | NASA T2 Patents | 약 300 | 키 없음, 정상 작동, "적용 가능한 우주 특허"라는 핵심 스토리. 시드별로 받고 case number로 중복 제거 |
| 2 | NASA T2 Spinoff | 약 100 | "우주 기술 → 지구 산업" 실제 사례. 토론 단계 근거로 강함 |
| 3 | NASA T2 Software | 약 80 | 바로 쓸 수 있는 도구 노드 |
| 4 | NASA NTRS | 약 150 | 같은 시드로 기술 보고서를 받아서 특허와 의미 유사도로 연결. `distribution=PUBLIC`만 |
| 5 | arXiv (astro-ph.IM, physics.space-ph, eess.SP) | 약 80 | 최신 연구 노드. 3초 간격 지키기 |
| 6 (실시간, 그래프에는 안 넣음) | Launch Library 2, CelesTrak | 캐시 1회 | 데모 화면의 "지금 우주에서 일어나는 일" 맥락용. 반드시 캐시 |
| 확장 (시간이 남으면) | Europe PMC / PubMed | 50 | "우주 기술이 바이오에 적용" 예시 (예: life support, imaging) |
| 확장 | Crossref | 보강만 | DOI와 저널 정보 보강, 중복 제거 |
| 오늘 이후 | OpenAlex(키) → NASA ADS(토큰) → EPO OPS → USPTO ODP → BigQuery | - | "모든 분야" 확장 로드맵 |

합계 약 710건 (특허·소프트웨어·Spinoff가 약 480건, 70% 이상). 임베딩은 Vectorize 제한에 맞춰 **768차원 이하**로 만든다. 예를 들어 Workers AI `@cf/baai/bge-base-en-v1.5`(768차원)나, 출력 차원을 768로 지정한 Gemini 임베딩을 쓸 수 있다.

## 5. Christian이 받아야 하는 키

**오늘 꼭 필요 (빌드가 막힘)**
1. `XAI_API_KEY`: xAI Console. Grok Voice에 쓰며 크레딧이 필요함 (약 $0.08/분).
2. `GEMINI_API_KEY`: Google AI Studio. Gemma 4 (`gemma-4-26b-a4b-it` 또는 `gemma-4-31b-it`)에 씀.
3. Cloudflare 계정: Workers, D1, Vectorize. `wrangler login`은 본인 로그인 필요.

**오늘 있으면 좋음 (즉시 발급, 무료)**
4. `NASA_API_KEY`: api.nasa.gov 폼에 이메일만 넣으면 바로 발급. DEMO_KEY 한도(하루 50회) 해소.
5. `OPENALEX_API_KEY`: openalex.org 계정 Settings에서 받거나, API로 요청한 뒤 Christian 이메일로 온 링크를 클릭. 전 분야 확장용.
6. `ADS_API_TOKEN`: ui.adsabs.harvard.edu 계정 → Settings → API Token. 우주 논문 품질이 가장 좋음.
7. `NCBI_API_KEY`: NCBI 계정 → Account settings. PubMed 초당 3회 → 10회.

**나중에 (승인이나 신원 인증이 필요해서 오늘은 비현실적)**
8. `CORE_API_KEY`: 등록 폼.
9. `S2_API_KEY`: Semantic Scholar 신청 폼. 승인 필요.
10. EPO OPS consumer key/secret: 등록 후 앱 생성, OAuth.
11. `USPTO_ODP_API_KEY`: USPTO.gov 계정 + ID.me 신원 인증.
12. Lens.org 토큰: Trial 수동 승인, 14일, 비상업용.
13. Google Cloud 프로젝트: BigQuery Google Patents용.
14. WIPO PATENTSCOPE API: 유료라서 제외.

## 출처 (공식 문서)
- USPTO ODP: https://data.uspto.gov/apis/getting-started , https://data.uspto.gov/apis/api-rate-limits , https://data.uspto.gov/support/transition-guide/patentsview
- EPO OPS: https://www.epo.org/en/searching-for-patents/data/web-services/ops
- Lens: https://support.lens.org/knowledge-base/lens-patent-and-scholar-api/ , https://about.lens.org/lens-api-terms-of-use/
- WIPO: https://www.wipo.int/en/web/patentscope/data/index , https://www.wipo.int/en/web/patentscope/data/terms_patentscope
- OpenAlex: https://help.openalex.org/api/authentication/
- arXiv: https://info.arxiv.org/help/api/tou.html
- Semantic Scholar: https://www.semanticscholar.org/product/api
- NCBI: https://support.nlm.nih.gov/knowledgebase/article/KA-05317/en-us
- CORE: https://api.core.ac.uk/docs/v3
- NASA ADS: https://github.com/adsabs/adsabs-dev-api
- Crossref: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- api.nasa.gov: https://api.nasa.gov/ (rate limits section)
- Launch Library 2: https://thespacedevs.com/llapi
- CelesTrak: https://celestrak.org/NORAD/documentation/gp-data-formats.php
- NASA T2 API: https://technology.nasa.gov/api/
