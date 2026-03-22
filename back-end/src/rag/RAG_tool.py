import argparse
import json
import os
import re
import sys
import threading
import unicodedata
from dataclasses import asdict, dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CORPUS_DIR = REPO_ROOT / "output_tax_laws_en" / "json_by_symbol"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
DEFAULT_TOP_K = 5
SERVICE_NAME = "tax-law-rag"
API_VERSION = "1.0.0"
MIN_SIMILARITY_SCORE = 0.03
MIN_CONFIDENT_SCORE = 0.08
MIN_EXCERPT_LENGTH = 40
MAX_ANSWER_EXCERPT_CHARS = 320
FALLBACK_ANSWER = "Hiện tại tôi không thể trả lời câu hỏi này"
QUESTION_STOPWORDS = {
    "la",
    "lao",
    "gi",
    "gii",
    "gi?",
    "nao",
    "lam",
    "bang",
    "duoc",
    "cho",
    "toi",
    "ve",
    "co",
    "khong",
    "nhung",
    "cac",
    "mot",
    "nhieu",
    "nay",
    "kia",
    "tai",
    "sao",
    "the",
    "nhu",
    "vao",
    "ra",
    "tu",
    "den",
    "khi",
    "giua",
    "cua",
    "theo",
    "voi",
    "va",
    "hoac",
    "trong",
    "tren",
    "noi",
    "ve",
}
DOMAIN_HINTS = (
    "thue",
    "hoa don",
    "hai quan",
    "nghi dinh",
    "thong tu",
    "phi",
    "le phi",
    "khau tru",
    "hoan thue",
    "gia tri gia tang",
    "thu nhap doanh nghiep",
    "thu nhap ca nhan",
    "xuat khau",
    "nhap khau",
    "ma so thue",
)
GENERIC_LEGAL_HINTS = (
    "luat",
    "van ban",
    "quyet dinh",
    "nghi quyet",
)
OFF_DOMAIN_HINTS = (
    "tai nan",
    "boi thuong",
    "bao hiem",
    "thuong tat",
    "benh vien",
    "tai nan giao thong",
    "tai nan lao dong",
    "hop dong lao dong",
    "ly hon",
    "hinh su",
    "dat dai",
)


def normalize_text(value: str) -> str:
    normalized = (value or "").replace("\u0110", "D").replace("\u0111", "d")
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def compact_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def sentence_split(text: str) -> list[str]:
    normalized = compact_whitespace(text)
    if not normalized:
        return []
    parts = re.split(r"(?<=[\.\!\?;:])\s+", normalized)
    return [part.strip() for part in parts if part.strip()]


def unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = normalize_text(value)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def trim_to_sentence_boundary(text: str, max_chars: int) -> str:
    compact = compact_whitespace(text)
    if len(compact) <= max_chars:
        return compact
    truncated = compact[:max_chars].rstrip(" ,;:")
    match = re.search(r"^(.+?[\.\!\?])(?:\s|$)", truncated)
    if match and len(match.group(1)) >= max_chars // 2:
        return match.group(1).strip()
    last_boundary = max(truncated.rfind("."), truncated.rfind(";"), truncated.rfind(":"))
    if last_boundary >= max_chars // 2:
        return truncated[: last_boundary + 1].strip()
    return truncated.rstrip() + "..."


def tokenize_question(value: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9]+", normalize_text(value))
        if len(token) >= 3 and token not in QUESTION_STOPWORDS
    ]


def format_vnd_amount(amount: int) -> list[str]:
    dotted = f"{amount:,}".replace(",", ".")
    return unique_preserve_order(
        [
            str(amount),
            dotted,
            f"{amount} dong",
            f"{dotted} dong",
        ]
    )


def extract_money_variants(value: str) -> list[str]:
    normalized = normalize_text(value)
    variants: list[str] = []
    pattern = re.compile(
        r"(\d+(?:[\.,]\d+)?)\s*(trieu|tr|ty|ti|nghin|ngan|tram|k)?\s*(dong)?"
    )
    multipliers = {
        "ty": 1_000_000_000,
        "ti": 1_000_000_000,
        "trieu": 1_000_000,
        "tr": 1_000_000,
        "nghin": 1_000,
        "ngan": 1_000,
        "k": 1_000,
        "tram": 100,
    }
    for match in pattern.finditer(normalized):
        raw_number = match.group(1)
        raw_unit = match.group(2) or ""
        raw_currency = match.group(3) or ""
        if not raw_number:
            continue
        if not raw_unit and not raw_currency:
            continue
        number_text = raw_number.replace(".", "").replace(",", ".")
        try:
            number_value = float(number_text)
        except ValueError:
            continue
        multiplier = multipliers.get(raw_unit, 1)
        amount = int(round(number_value * multiplier))
        if amount <= 0:
            continue
        variants.extend(
            [
                raw_number,
                f"{raw_number} {raw_unit}".strip(),
                f"{raw_number} {raw_unit} dong".strip(),
                *format_vnd_amount(amount),
            ]
        )
    return unique_preserve_order([item for item in variants if item])


@dataclass
class Chunk:
    chunk_id: str
    symbol: str
    title: str
    detail_url: str
    document_type: str
    issuing_agency: str
    issue_date: str
    effective_date: str
    summary: str
    text: str
    normalized_text: str
    source_file: str


@dataclass
class RetrievalResult:
    chunk_id: str
    score: float
    symbol: str
    title: str
    detail_url: str
    issue_date: str
    effective_date: str
    document_type: str
    issuing_agency: str
    excerpt: str
    source_file: str


@dataclass
class QueryAnalysis:
    normalized_question: str
    rewritten_query: str
    tokens: list[str]
    cited_symbol: str
    years: list[str]
    money_variants: list[str]
    tax_keywords: list[str]
    generic_legal_keywords: list[str]
    off_domain_keywords: list[str]


class TaxLawRAG:
    def __init__(self, corpus_dir: str | Path = DEFAULT_CORPUS_DIR) -> None:
        self.corpus_dir = Path(corpus_dir)
        self._lock = threading.Lock()
        self._chunks: list[Chunk] = []
        self._vectorizer: TfidfVectorizer | None = None
        self._matrix: Any = None
        self._loaded = False
        self._last_question = ""

    def ensure_loaded(self, force: bool = False) -> None:
        with self._lock:
            if self._loaded and not force:
                return
            self._chunks = self._load_chunks()
            corpus = [chunk.normalized_text for chunk in self._chunks]
            self._vectorizer = None
            self._matrix = None
            if corpus:
                self._vectorizer = TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                )
                self._matrix = self._vectorizer.fit_transform(corpus)
            self._loaded = True

    def _load_chunks(self) -> list[Chunk]:
        if not self.corpus_dir.exists():
            return []

        chunks: list[Chunk] = []
        for path in sorted(self.corpus_dir.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            chunks.extend(self._chunks_from_payload(payload, path))
        return chunks

    def _chunks_from_payload(self, payload: dict[str, Any], path: Path) -> list[Chunk]:
        symbol = payload.get("symbol", "")
        title = payload.get("title", "")
        detail_url = payload.get("detail_url", "")
        document_type = payload.get("document_type", "")
        issuing_agency = payload.get("issuing_agency", "")
        issue_date = payload.get("issue_date", "")
        effective_date = payload.get("effective_date", "")
        summary = payload.get("summary", "")
        content = payload.get("content", {}) or {}
        paragraphs = [compact_whitespace(item) for item in content.get("paragraphs", []) if compact_whitespace(item)]
        search_text = compact_whitespace(payload.get("search_text", ""))
        metadata_text = compact_whitespace(
            " ".join(
                [
                    f"Ký hiệu {symbol}." if symbol else "",
                    title,
                    f"Loại văn bản {document_type}." if document_type else "",
                    f"Cơ quan ban hành {issuing_agency}." if issuing_agency else "",
                    f"Ngày ban hành {issue_date}." if issue_date else "",
                    f"Ngày hiệu lực {effective_date}." if effective_date else "",
                    summary,
                ]
            )
        )

        sections: list[str] = []
        if paragraphs:
            current: list[str] = []
            current_len = 0
            for paragraph in paragraphs:
                if current and current_len + len(paragraph) > 1400:
                    sections.append(" ".join(current))
                    current = current[-2:]
                    current_len = sum(len(item) for item in current)
                current.append(paragraph)
                current_len += len(paragraph)
            if current:
                sections.append(" ".join(current))
        elif search_text:
            sections = [search_text]
        else:
            sections = [metadata_text]

        chunks: list[Chunk] = []
        for index, section in enumerate(sections, start=1):
            combined = compact_whitespace(f"{metadata_text} {section}")
            chunks.append(
                Chunk(
                    chunk_id=f"{path.stem}:{index}",
                    symbol=symbol,
                    title=title,
                    detail_url=detail_url,
                    document_type=document_type,
                    issuing_agency=issuing_agency,
                    issue_date=issue_date,
                    effective_date=effective_date,
                    summary=summary,
                    text=combined,
                    normalized_text=normalize_text(combined),
                    source_file=str(path),
                )
            )
        return chunks

    def _analyze_question(self, question: str) -> QueryAnalysis:
        normalized_question = normalize_text(question)
        tokens = tokenize_question(question)
        years = unique_preserve_order(re.findall(r"\b(?:19|20)\d{2}\b", normalized_question))
        money_variants = extract_money_variants(question)
        symbol_match = re.search(r"\b\d+[\/\-]\d{2,4}(?:[\/\-][a-z0-9]+)+\b", normalized_question)
        tax_keywords = [hint for hint in DOMAIN_HINTS if hint in normalized_question]
        generic_legal_keywords = [hint for hint in GENERIC_LEGAL_HINTS if hint in normalized_question]
        off_domain_keywords = [hint for hint in OFF_DOMAIN_HINTS if hint in normalized_question]

        rewritten_parts = unique_preserve_order(
            ([symbol_match.group(0)] if symbol_match else [])
            + money_variants
            + tax_keywords
            + years
            + tokens
        )
        rewritten_query = " ".join(rewritten_parts) or normalized_question
        return QueryAnalysis(
            normalized_question=normalized_question,
            rewritten_query=rewritten_query,
            tokens=tokens,
            cited_symbol=symbol_match.group(0) if symbol_match else "",
            years=years,
            money_variants=money_variants,
            tax_keywords=tax_keywords,
            generic_legal_keywords=generic_legal_keywords,
            off_domain_keywords=off_domain_keywords,
        )

    def _score_result(self, chunk: Chunk, base_score: float, analysis: QueryAnalysis) -> float:
        score = base_score
        token_set = set(analysis.rewritten_query.split())
        overlap = sum(1 for token in token_set if token and token in chunk.normalized_text)
        if overlap:
            score += min(0.12, overlap * 0.01)

        symbol_key = normalize_text(chunk.symbol)
        if symbol_key and symbol_key in analysis.normalized_question:
            score += 0.2
        if analysis.cited_symbol and analysis.cited_symbol == symbol_key:
            score += 0.15

        if analysis.years:
            searchable_years = normalize_text(f"{chunk.issue_date} {chunk.effective_date} {chunk.title}")
            year_hits = sum(1 for year in analysis.years if year in searchable_years)
            score += min(0.06, year_hits * 0.03)

        if analysis.money_variants:
            money_hits = sum(1 for variant in analysis.money_variants if variant in chunk.normalized_text)
            score += min(0.2, money_hits * 0.05)

        if analysis.tax_keywords:
            keyword_hits = sum(1 for hint in analysis.tax_keywords if hint in chunk.normalized_text)
            score += min(0.12, keyword_hits * 0.03)

        if analysis.off_domain_keywords:
            off_domain_hits = sum(1 for hint in analysis.off_domain_keywords if hint in chunk.normalized_text)
            score -= min(0.2, off_domain_hits * 0.05)

        return score

    def _build_answer_text(self, lead: RetrievalResult) -> str:
        headline = lead.symbol or lead.title or "van ban lien quan"
        if lead.symbol and lead.title:
            headline = f"{lead.symbol} - {lead.title}"

        date_parts: list[str] = []
        if lead.issue_date:
            date_parts.append(f"ban hanh ngay {lead.issue_date}")
        if lead.effective_date:
            date_parts.append(f"co hieu luc ngay {lead.effective_date}")

        excerpt_sentences = sentence_split(lead.excerpt)
        excerpt = " ".join(unique_preserve_order(excerpt_sentences[:2]))
        excerpt = trim_to_sentence_boundary(excerpt, MAX_ANSWER_EXCERPT_CHARS)

        answer_parts = [f"Van ban phu hop nhat: {headline}."]
        if date_parts:
            answer_parts.append("Thong tin thoi gian: " + ", ".join(date_parts) + ".")
        if excerpt:
            answer_parts.append("Noi dung chinh: " + excerpt)
        return " ".join(answer_parts).strip()

    def retrieve(self, question: str, top_k: int = DEFAULT_TOP_K) -> list[RetrievalResult]:
        self.ensure_loaded()
        question = compact_whitespace(question)
        if not question or not self._chunks or self._vectorizer is None or self._matrix is None:
            return []

        analysis = self._analyze_question(question)
        query_vector = self._vectorizer.transform([analysis.rewritten_query])
        raw_scores = (self._matrix @ query_vector.T).toarray().ravel()
        rescored: list[tuple[float, Chunk]] = []

        for index, chunk in enumerate(self._chunks):
            score = self._score_result(chunk, float(raw_scores[index]), analysis)
            rescored.append((score, chunk))

        rescored.sort(key=lambda item: item[0], reverse=True)
        results: list[RetrievalResult] = []
        seen_docs: set[str] = set()
        for score, chunk in rescored:
            if score < MIN_SIMILARITY_SCORE and results:
                break
            doc_key = chunk.symbol or chunk.title
            if doc_key in seen_docs:
                continue
            seen_docs.add(doc_key)
            results.append(
                RetrievalResult(
                    chunk_id=chunk.chunk_id,
                    score=round(score, 4),
                    symbol=chunk.symbol,
                    title=chunk.title,
                    detail_url=chunk.detail_url,
                    issue_date=chunk.issue_date,
                    effective_date=chunk.effective_date,
                    document_type=chunk.document_type,
                    issuing_agency=chunk.issuing_agency,
                    excerpt=self._best_excerpt(chunk.text, analysis.rewritten_query),
                    source_file=chunk.source_file,
                )
            )
            if len(results) >= max(1, top_k):
                break
        return results

    def _best_excerpt(self, text: str, normalized_question: str, max_sentences: int = 3) -> str:
        sentences = sentence_split(text)
        if not sentences:
            return compact_whitespace(text)[:600]

        tokens = [token for token in normalized_question.split() if len(token) > 1]
        scored: list[tuple[int, int, str]] = []
        for index, sentence in enumerate(sentences):
            normalized_sentence = normalize_text(sentence)
            overlap = sum(1 for token in tokens if token in normalized_sentence)
            if overlap:
                score = overlap * 10 + max(0, 160 - abs(len(sentence) - 220))
            else:
                score = max(0, 100 - abs(len(sentence) - 180))
            scored.append((score, -index, sentence))
        scored.sort(reverse=True)
        selected = [sentence for _, _, sentence in scored[:max_sentences]]
        excerpt = " ".join(unique_preserve_order(selected))
        return excerpt[:900].strip()

    def answer_question(self, question: str, top_k: int = DEFAULT_TOP_K) -> dict[str, Any]:
        self._last_question = question
        results = self.retrieve(question, top_k=top_k)
        if not self._can_answer(results):
            return {
                "question": question,
                "answer": FALLBACK_ANSWER,
                "sources": [],
                "language": "vi",
                "answered": False,
                "rules_applied": self._response_rules(),
            }

        lead = results[0]
        return {
            "question": question,
            "answer": self._build_answer_text(lead),
            "sources": [asdict(result) for result in results],
            "language": "vi",
            "answered": True,
            "confidence": round(lead.score, 4),
            "rules_applied": self._response_rules(),
        }

        headline = lead.symbol or lead.title or "van ban lien quan"
        if lead.symbol and lead.title:
            headline = f"{lead.symbol} - {lead.title}"

        date_parts: list[str] = []
        if lead.issue_date:
            date_parts.append(f"ban hành ngày {lead.issue_date}")
        if lead.effective_date:
            date_parts.append(f"có hiệu lực ngày {lead.effective_date}")

        excerpt_sentences = sentence_split(lead.excerpt)
        excerpt = " ".join(unique_preserve_order(excerpt_sentences[:2]))
        excerpt = trim_to_sentence_boundary(excerpt, MAX_ANSWER_EXCERPT_CHARS)

        concise_answer_parts = [f"Văn bản phù hợp nhất: {headline}."]
        if date_parts:
            concise_answer_parts.append("Thông tin thời gian: " + ", ".join(date_parts) + ".")
        if excerpt:
            concise_answer_parts.append("Nội dung chính: " + excerpt)

        return {
            "question": question,
            "answer": " ".join(concise_answer_parts).strip(),
            "sources": [asdict(result) for result in results],
            "language": "vi",
            "answered": True,
            "rules_applied": self._response_rules(),
        }

        facts: list[str] = []
        if lead.symbol:
            facts.append(f"văn bản phù hợp nhất là {lead.symbol}")
        if lead.title:
            facts.append(lead.title)
        if lead.issue_date:
            facts.append(f"ban hành ngày {lead.issue_date}")
        if lead.effective_date:
            facts.append(f"có hiệu lực ngày {lead.effective_date}")

        answer_parts = [
            "Theo dữ liệu pháp luật đã lập chỉ mục, " + ", ".join(facts) + "."
            if facts
            else "Theo dữ liệu pháp luật đã lập chỉ mục, tôi tìm được văn bản liên quan trực tiếp."
        ]

        excerpts = [result.excerpt for result in results[:2] if result.excerpt]
        if excerpts:
            answer_parts.append("Nội dung liên quan nhất: " + " ".join(unique_preserve_order(excerpts)))

        if len(results) > 1:
            related_docs = []
            for item in results[1:3]:
                label = item.symbol or item.title
                if not label:
                    continue
                related_docs.append(label)
            if related_docs:
                answer_parts.append("Văn bản liên quan thêm: " + "; ".join(related_docs) + ".")

        return {
            "question": question,
            "answer": " ".join(answer_parts).strip(),
            "sources": [asdict(result) for result in results],
            "language": "vi",
            "answered": True,
            "rules_applied": self._response_rules(),
        }

    def answer_text(self, question: str, top_k: int = DEFAULT_TOP_K) -> str:
        return self.answer_question(question=question, top_k=top_k)["answer"]

    def _can_answer(self, results: list[RetrievalResult]) -> bool:
        if not results:
            return False
        lead = results[0]
        if lead.score < MIN_CONFIDENT_SCORE:
            return False
        if len(compact_whitespace(lead.excerpt)) < MIN_EXCERPT_LENGTH:
            return False
        question_text = getattr(self, "_last_question", "")
        if not self._question_in_supported_domain(question_text, lead):
            return False
        if not self._has_sufficient_question_overlap(question_text, lead):
            return False
        return True

    def _response_rules(self) -> list[str]:
        return [
            "Chỉ trả lời bằng tiếng Việt.",
            "Chỉ dùng thông tin có trong kho dữ liệu đã lập chỉ mục.",
            "Nếu không đủ căn cứ hoặc không tìm thấy câu trả lời phù hợp thì trả về đúng câu fallback.",
            "Không suy đoán, không bịa thêm thông tin ngoài nguồn truy xuất được.",
        ]

    def _question_in_supported_domain(self, question: str, lead: RetrievalResult) -> bool:
        analysis = self._analyze_question(question)
        if not analysis.normalized_question:
            return False
        if analysis.off_domain_keywords:
            return False
        if analysis.cited_symbol:
            return True
        if analysis.tax_keywords:
            return True
        if analysis.generic_legal_keywords:
            lead_text = normalize_text(
                f"{lead.symbol} {lead.title} {lead.document_type} {lead.issuing_agency} {lead.excerpt}"
            )
            tax_overlap = [hint for hint in DOMAIN_HINTS if hint in lead_text]
            return len(tax_overlap) >= 2
        lead_title = normalize_text(f"{lead.symbol} {lead.title} {lead.document_type}")
        if lead.symbol and normalize_text(lead.symbol) in analysis.normalized_question:
            return True
        if any(token in lead_title for token in analysis.tokens if token in DOMAIN_HINTS):
            return True
        return False

    def _has_sufficient_question_overlap(self, question: str, lead: RetrievalResult) -> bool:
        analysis = self._analyze_question(question)
        if not analysis.tokens:
            if not analysis.money_variants:
                return False
        if analysis.off_domain_keywords:
            return False
        searchable = normalize_text(f"{lead.symbol} {lead.title} {lead.excerpt}")
        overlap = [token for token in analysis.tokens if token in searchable]
        money_overlap = [variant for variant in analysis.money_variants if variant in searchable]
        if lead.symbol and normalize_text(lead.symbol) in analysis.normalized_question:
            return True
        if money_overlap:
            return True
        if analysis.tax_keywords:
            tax_overlap = [token for token in analysis.tax_keywords if token in searchable]
            return len(set(tax_overlap)) >= 1
        return len(set(overlap)) >= 3

    def document_count(self) -> int:
        self.ensure_loaded()
        return len({chunk.symbol or chunk.title for chunk in self._chunks})


class TaxLawBot:
    def __init__(self, corpus_dir: str | Path = DEFAULT_CORPUS_DIR, top_k: int = DEFAULT_TOP_K) -> None:
        self.corpus_dir = Path(corpus_dir)
        self.top_k = top_k
        self.engine = TaxLawRAG(self.corpus_dir)
        self.engine.ensure_loaded()

    def ask(self, question: str, top_k: int | None = None) -> str:
        return self.engine.answer_text(question=question, top_k=top_k or self.top_k)

    def ask_detail(self, question: str, top_k: int | None = None) -> dict[str, Any]:
        return self.engine.answer_question(question=question, top_k=top_k or self.top_k)

    def reload(self) -> None:
        self.engine.ensure_loaded(force=True)

    def document_count(self) -> int:
        return self.engine.document_count()


_DEFAULT_ENGINE: TaxLawRAG | None = None


def get_engine(corpus_dir: str | Path = DEFAULT_CORPUS_DIR) -> TaxLawRAG:
    global _DEFAULT_ENGINE
    corpus_dir = Path(corpus_dir)
    if _DEFAULT_ENGINE is None or corpus_dir != _DEFAULT_ENGINE.corpus_dir:
        _DEFAULT_ENGINE = TaxLawRAG(corpus_dir)
    return _DEFAULT_ENGINE


def answer_question(question: str, corpus_dir: str | Path = DEFAULT_CORPUS_DIR, top_k: int = DEFAULT_TOP_K) -> dict[str, Any]:
    engine = get_engine(corpus_dir)
    return engine.answer_question(question=question, top_k=top_k)


def answer_text(question: str, corpus_dir: str | Path = DEFAULT_CORPUS_DIR, top_k: int = DEFAULT_TOP_K) -> str:
    engine = get_engine(corpus_dir)
    return engine.answer_text(question=question, top_k=top_k)


def make_handler(engine: TaxLawRAG) -> type[BaseHTTPRequestHandler]:
    class TaxLawAPIHandler(BaseHTTPRequestHandler):
        def _write_json(self, status_code: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            self.wfile.write(body)

        def _service_meta(self) -> dict[str, Any]:
            return {
                "service": SERVICE_NAME,
                "api_version": API_VERSION,
                "documents": engine.document_count(),
                "chunks": len(engine._chunks),
            }

        def do_OPTIONS(self) -> None:
            self._write_json(200, {"ok": True})

        def do_GET(self) -> None:
            if self.path == "/health":
                self._write_json(
                    200,
                    {
                        "ok": True,
                        **self._service_meta(),
                    },
                )
                return
            if self.path == "/documents":
                engine.ensure_loaded()
                payload = self._service_meta()
                self._write_json(200, payload)
                return
            self._write_json(404, {"error": "Not found"})

        def do_POST(self) -> None:
            if self.path == "/reload":
                engine.ensure_loaded(force=True)
                self._write_json(
                    200,
                    {
                        "ok": True,
                        "message": "Index reloaded",
                        **self._service_meta(),
                    },
                )
                return
            if self.path != "/answer":
                self._write_json(404, {"error": "Not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
                payload = json.loads(raw_body)
            except json.JSONDecodeError:
                self._write_json(400, {"error": "Invalid JSON body"})
                return

            question = compact_whitespace(str(payload.get("question", "")))
            top_k = int(payload.get("top_k", DEFAULT_TOP_K) or DEFAULT_TOP_K)
            if not question:
                self._write_json(400, {"error": "Field 'question' is required"})
                return

            response = engine.answer_question(question=question, top_k=top_k)
            response["service"] = SERVICE_NAME
            response["api_version"] = API_VERSION
            self._write_json(200, response)

        def log_message(self, format: str, *args: Any) -> None:
            return

    return TaxLawAPIHandler


def serve(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, corpus_dir: str | Path = DEFAULT_CORPUS_DIR) -> None:
    engine = TaxLawRAG(corpus_dir)
    engine.ensure_loaded()
    server = ThreadingHTTPServer((host, port), make_handler(engine))
    print(f"Tax law RAG API listening on http://{host}:{port}")
    server.serve_forever()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="RAG API for Vietnamese tax-law documents.")
    parser.add_argument("--corpus-dir", type=Path, default=DEFAULT_CORPUS_DIR)
    parser.add_argument("--serve", action="store_true", help="Run an HTTP API server.")
    parser.add_argument("--host", default=os.getenv("RAG_HOST", DEFAULT_HOST))
    parser.add_argument("--port", type=int, default=int(os.getenv("RAG_PORT", str(DEFAULT_PORT))))
    parser.add_argument("--question", default="", help="Ask one question from the command line.")
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K)
    parser.add_argument("--reload-index", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    engine = get_engine(args.corpus_dir)
    engine.ensure_loaded(force=args.reload_index)

    if args.serve:
        serve(host=args.host, port=args.port, corpus_dir=args.corpus_dir)
        return 0

    if args.question:
        payload = engine.answer_question(args.question, top_k=args.top_k)
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(
        json.dumps(
            {
                "message": "Use --serve to run the API or --question to query directly.",
                "documents": engine.document_count(),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())






