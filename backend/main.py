import logging
import uuid
import time
import random
from typing import Dict, Any, List
from datetime import datetime, date, timedelta

from fastapi import FastAPI, Request, Response, status, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import get_settings
from schemas import (
    ErrorCode,
    AppError,
    ExplainRequest,
    ExplainOutput,
    ExplainData,
    SummarizeRequest,
    SummaryOutput,
    SummaryData,
    QuizRequest,
    QuizOutput,
    QuizData,
    QuizQuestion,
    StudyPlanRequest,
    PlanOutput,
    PlanData,
    PlanDay,
    PlanSession,
    SuccessEnvelope,
)
import prompts
from gemma_service import get_gemma_service, GemmaService

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("studyspark")

# Slowapi limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])

app = FastAPI(
    title="StudySpark AI API",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
    debug=False,
)
app.state.limiter = limiter


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    def __init__(self, app, max_body_size: int = 64 * 1024):
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_size:
                    await self._reject(scope, receive, send)
                    return
            except ValueError:
                pass

        received_bytes = 0

        async def limited_receive():
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_body_size:
                    raise RequestBodyTooLarge()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await self._reject(scope, receive, send)

    async def _reject(self, scope, receive, send):
        response = JSONResponse(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            content={
                "ok": False,
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR.value,
                    "message": "Request body must not exceed 64 KiB.",
                    "retryable": False,
                    "details": {"field": "request"},
                },
            },
        )
        await response(scope, receive, send)


# CORS is outermost so its headers also apply to rejected requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-Id"],
    expose_headers=["X-Request-Id"],
)
app.add_middleware(RequestBodyLimitMiddleware)


# ============================================================================
# Middlewares
# ============================================================================

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Assigns request ID, measures latency, attaches headers,
    and logs exactly one structured line per request (02-TRD §8 & NFR-12).
    Never logs raw user notes or topics at INFO.
    """
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.perf_counter()

    try:
        response: Response = await call_next(request)
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error(
            f"request_id={request_id} endpoint={request.url.path} status=500 latency_ms={latency_ms} error={exc.__class__.__name__}"
        )
        raise

    latency_ms = int((time.perf_counter() - start_time) * 1000)
    response.headers["X-Request-Id"] = request_id

    logger.info(
        f"request_id={request_id} endpoint={request.url.path} status={response.status_code} latency_ms={latency_ms}"
    )
    return response


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "ok": False,
            "error": {
                "code": ErrorCode.RATE_LIMITED.value,
                "message": "Too many requests. Please wait a moment and try again.",
                "retryable": True,
            },
        },
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    error_payload: Dict[str, Any] = {
        "code": exc.code.value,
        "message": exc.message,
        "retryable": exc.retryable,
    }
    if exc.details is not None:
        error_payload["details"] = exc.details

    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "error": error_payload},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """
    Replaces FastAPI's default 422 body with the standard StudySpark error envelope.
    """
    errors = exc.errors()
    first_err = errors[0] if errors else {}
    loc = first_err.get("loc", [])
    field_name = str(loc[-1]) if loc else "request"
    msg = first_err.get("msg", "Invalid input.")

    # Format human-friendly message if possible
    if "Value error," in msg:
        msg = msg.replace("Value error,", "").strip()

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "ok": False,
            "error": {
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": msg,
                "retryable": False,
                "details": {"field": field_name},
            },
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled server error (request_id=%s, error_type=%s)",
        getattr(request.state, "request_id", "unknown"),
        type(exc).__name__,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "ok": False,
            "error": {
                "code": ErrorCode.INTERNAL_ERROR.value,
                "message": "An unexpected error occurred. Please try again.",
                "retryable": True,
            },
        },
    )


# ============================================================================
# Endpoints (05-API-Spec §3-§7)
# ============================================================================

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint per 05-API-Spec §3.
    Always fast, no model call.
    """
    current_settings = get_settings()
    return {
        "status": "ok",
        "ai_configured": current_settings.is_ai_configured,
        "model": current_settings.gemma_model,
        "version": "1.0.0",
    }


@app.post("/api/explain", response_model=SuccessEnvelope[ExplainData])
@limiter.limit(settings.rate_limit)
async def explain_topic(
    payload: ExplainRequest,
    request: Request,
    gemma: GemmaService = Depends(get_gemma_service),
):
    """
    POST /api/explain: Explain a topic for a beginner/intermediate/advanced student.
    """
    system, user = prompts.build_explain_prompt(
        topic=payload.topic,
        level=payload.level.value,
        language=payload.language.value,
    )

    output: ExplainOutput
    output, meta = await gemma.generate_json(
        system=system,
        user=user,
        output_model=ExplainOutput,
        temperature=0.4,
        max_output_tokens=1200,
        language=payload.language.value,
    )

    # Post-processing per 05-API-Spec §4: clamp key_points to 5
    clamped_key_points = [p.strip() for p in output.key_points if p.strip()][:5]

    data = ExplainData(
        title=output.title.strip(),
        explanation=output.explanation.strip(),
        example=output.example.strip(),
        key_points=clamped_key_points,
        quick_recap=output.quick_recap.strip(),
    )

    return {"ok": True, "data": data, "meta": meta}


@app.post("/api/summarize", response_model=SuccessEnvelope[SummaryData])
@limiter.limit(settings.rate_limit)
async def summarize_notes(
    payload: SummarizeRequest,
    request: Request,
    gemma: GemmaService = Depends(get_gemma_service),
):
    """
    POST /api/summarize: Summarize student notes with key terms.
    """
    system, user = prompts.build_summary_prompt(
        notes=payload.notes,
        length=payload.length.value,
        language=payload.language.value,
    )

    output: SummaryOutput
    output, meta = await gemma.generate_json(
        system=system,
        user=user,
        output_model=SummaryOutput,
        temperature=0.3,
        max_output_tokens=1000,
        language=payload.language.value,
    )

    # Post-processing per 05-API-Spec §5: clamp key_points to 7, key_terms to 6
    clamped_key_points = [p.strip() for p in output.key_points if p.strip()][:7]
    clamped_terms = output.key_terms[:6]

    data = SummaryData(
        summary=output.summary.strip(),
        key_points=clamped_key_points,
        key_terms=clamped_terms,
    )

    return {"ok": True, "data": data, "meta": meta}


@app.post("/api/quiz", response_model=SuccessEnvelope[QuizData])
@limiter.limit(settings.rate_limit)
async def generate_quiz(
    payload: QuizRequest,
    request: Request,
    gemma: GemmaService = Depends(get_gemma_service),
):
    """
    POST /api/quiz: Generate 5 multiple-choice questions with shuffled options.
    """
    system, user = prompts.build_quiz_prompt(
        content=payload.content,
        difficulty=payload.difficulty.value,
        language=payload.language.value,
    )

    output: QuizOutput
    output, meta = await gemma.generate_json(
        system=system,
        user=user,
        output_model=QuizOutput,
        temperature=0.5,
        max_output_tokens=2000,
        language=payload.language.value,
    )

    # Post-processing per 05-API-Spec §6:
    # Truncate to 5 questions, shuffle options, remap correct_index, assign ids q1..q5
    processed_questions: List[QuizQuestion] = []
    selected_raw = output.questions[:5]

    for idx, raw_q in enumerate(selected_raw):
        q_id = f"q{idx + 1}"
        orig_options = [opt.strip() for opt in raw_q.options]
        correct_answer_text = orig_options[raw_q.correct_index]

        # Shuffle options
        shuffled_options = list(orig_options)
        random.shuffle(shuffled_options)
        new_correct_index = shuffled_options.index(correct_answer_text)

        processed_questions.append(
            QuizQuestion(
                id=q_id,
                question=raw_q.question.strip(),
                options=shuffled_options,
                correct_index=new_correct_index,
                explanation=raw_q.explanation.strip(),
            )
        )

    data = QuizData(
        topic=output.topic.strip(),
        questions=processed_questions,
    )

    return {"ok": True, "data": data, "meta": meta}


@app.post("/api/study-plan", response_model=SuccessEnvelope[PlanData])
@limiter.limit(settings.rate_limit)
async def generate_study_plan(
    payload: StudyPlanRequest,
    request: Request,
    gemma: GemmaService = Depends(get_gemma_service),
):
    """
    POST /api/study-plan: Generate personalized study plan across horizon days.
    """

    # Pre-processing per 05-API-Spec §7
    start_d = (
        datetime.strptime(payload.start_date, "%Y-%m-%d").date()
        if payload.start_date
        else date.today()
    )

    # Calculate horizon days & truncated flag
    deadlines = [
        datetime.strptime(s.deadline, "%Y-%m-%d").date()
        for s in payload.subjects
        if s.deadline
    ]

    if deadlines:
        latest_deadline = max(deadlines)
        raw_span = (latest_deadline - start_d).days + 1
        horizon_days = min(14, raw_span)
        truncated = raw_span > 14
    else:
        horizon_days = 7
        truncated = False

    daily_minutes = int(payload.daily_hours * 60)

    # Build subject lines and detail text
    subject_lines_list = []
    subject_detail_list = []
    subject_deadlines_map = {}

    for s in payload.subjects:
        subject_deadlines_map[s.name.lower()] = (
            datetime.strptime(s.deadline, "%Y-%m-%d").date() if s.deadline else None
        )
        if s.deadline:
            dl_day = (datetime.strptime(s.deadline, "%Y-%m-%d").date() - start_d).days + 1
            subject_lines_list.append(f"- {s.name} (deadline_day {dl_day})")
        else:
            subject_lines_list.append(f"- {s.name} (no deadline)")

        detail = f"- {s.name}: {s.topics or 'General revision and practice'}"
        subject_detail_list.append(detail)

    subject_lines = "\n".join(subject_lines_list)
    subjects_detail = "\n".join(subject_detail_list)

    system, user = prompts.build_plan_prompt(
        horizon_days=horizon_days,
        daily_minutes=daily_minutes,
        subject_lines=subject_lines,
        subjects_detail=subjects_detail,
        language=payload.language.value,
    )

    output: PlanOutput
    output, meta = await gemma.generate_json(
        system=system,
        user=user,
        output_model=PlanOutput,
        temperature=0.5,
        max_output_tokens=3500,
        language=payload.language.value,
    )

    # Post-processing per 05-API-Spec §7:
    # 1. Check subject coverage
    scheduled_subject_names = set()
    for day_obj in output.days:
        for sess in day_obj.sessions:
            scheduled_subject_names.add(sess.subject.strip().lower())

    missing_subjects = [
        s.name for s in payload.subjects if s.name.lower() not in scheduled_subject_names
    ]

    # Tips: clamped to 3-5 strings; add note if any subject was missing
    tips_list = [t.strip() for t in output.tips if t.strip()][:5]
    if missing_subjects:
        tips_list.append(
            f"Note: Could not schedule all topics for {', '.join(missing_subjects)} within the available time."
        )
        tips_list = tips_list[:5]

    # 2. Map day objects (drop days outside 1..horizon_days; fill missing days with rest day)
    days_by_num: Dict[int, List[PlanSession]] = {}
    for day_obj in output.days:
        if 1 <= day_obj.day <= horizon_days:
            clean_sessions: List[PlanSession] = []
            day_date = start_d + timedelta(days=day_obj.day - 1)

            for s_idx, sess in enumerate(day_obj.sessions):
                # Drop session if subject has a deadline earlier than this day's date
                sub_deadline = subject_deadlines_map.get(sess.subject.strip().lower())
                if sub_deadline is not None and sub_deadline < day_date:
                    logger.info("Dropping a plan session after its subject deadline (day=%s)", day_obj.day)
                    continue

                session_id = f"d{day_obj.day}-s{len(clean_sessions) + 1}"
                clean_sessions.append(
                    PlanSession(
                        id=session_id,
                        subject=sess.subject.strip(),
                        topic=sess.topic.strip(),
                        minutes=max(5, min(240, sess.minutes)),
                        activity=sess.activity,
                    )
                )
            days_by_num[day_obj.day] = clean_sessions

    processed_days: List[PlanDay] = []
    for d_num in range(1, horizon_days + 1):
        d_date_str = (start_d + timedelta(days=d_num - 1)).isoformat()
        sessions = days_by_num.get(d_num, [])

        # Check total daily minutes warning
        total_day_minutes = sum(s.minutes for s in sessions)
        if total_day_minutes > (daily_minutes * 1.1):
            logger.warning(
                f"Day {d_num} total minutes ({total_day_minutes}) exceeds daily_hours limit ({daily_minutes})"
            )

        processed_days.append(
            PlanDay(
                day=d_num,
                date=d_date_str,
                sessions=sessions,
            )
        )

    data = PlanData(
        summary=output.summary.strip(),
        horizon_days=horizon_days,
        truncated=truncated,
        days=processed_days,
        tips=tips_list,
    )

    return {"ok": True, "data": data, "meta": meta}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
