from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any, Generic, TypeVar
from datetime import date, datetime, timedelta
import uuid
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


# ============================================================================
# Enums (05-API-Spec §1 & §2)
# ============================================================================

class Language(str, Enum):
    EN = "en"
    HI = "hi"


class Level(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Length(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Activity(str, Enum):
    LEARN = "learn"
    PRACTICE = "practice"
    REVISE = "revise"
    TEST = "test"


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNSUITABLE_INPUT = "UNSUITABLE_INPUT"
    RATE_LIMITED = "RATE_LIMITED"
    MODEL_OUTPUT_INVALID = "MODEL_OUTPUT_INVALID"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    MODEL_TIMEOUT = "MODEL_TIMEOUT"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Map error codes to HTTP status and default retryable status (05-API-Spec §2)
ERROR_HTTP_STATUS: Dict[ErrorCode, int] = {
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.UNSUITABLE_INPUT: 422,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.MODEL_OUTPUT_INVALID: 502,
    ErrorCode.MODEL_UNAVAILABLE: 503,
    ErrorCode.MODEL_TIMEOUT: 504,
    ErrorCode.INTERNAL_ERROR: 500,
}

ERROR_RETRYABLE: Dict[ErrorCode, bool] = {
    ErrorCode.VALIDATION_ERROR: False,
    ErrorCode.UNSUITABLE_INPUT: False,
    ErrorCode.RATE_LIMITED: True,
    ErrorCode.MODEL_OUTPUT_INVALID: True,
    ErrorCode.MODEL_UNAVAILABLE: True,
    ErrorCode.MODEL_TIMEOUT: True,
    ErrorCode.INTERNAL_ERROR: True,
}


class AppError(Exception):
    """Application-level error that formats directly into the error envelope."""
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: Optional[int] = None,
        retryable: Optional[bool] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code or ERROR_HTTP_STATUS.get(code, 500)
        self.retryable = retryable if retryable is not None else ERROR_RETRYABLE.get(code, True)
        self.details = details


# ============================================================================
# Request Models (05-API-Spec §4-§7 & 02-TRD §6)
# ============================================================================

class BaseTrimmedModel(BaseModel):
    """Base model that automatically trims whitespace and ignores extra fields."""
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class ExplainRequest(BaseTrimmedModel):
    topic: str = Field(..., min_length=3, max_length=500, description="Study topic (3-500 chars)")
    level: Level = Field(default=Level.BEGINNER)
    language: Language = Field(default=Language.EN)


class SummarizeRequest(BaseTrimmedModel):
    notes: str = Field(..., min_length=50, max_length=8000, description="Notes to summarize (50-8000 chars)")
    length: Length = Field(default=Length.SHORT)
    language: Language = Field(default=Language.EN)


class QuizRequest(BaseTrimmedModel):
    content: str = Field(..., min_length=3, max_length=6000, description="Topic or pasted notes (3-6000 chars)")
    difficulty: Difficulty = Field(default=Difficulty.MEDIUM)
    language: Language = Field(default=Language.EN)


class SubjectInput(BaseTrimmedModel):
    name: str = Field(..., min_length=1, max_length=80, description="Subject name (1-80 chars)")
    deadline: Optional[str] = Field(default=None, description="YYYY-MM-DD deadline")
    topics: Optional[str] = Field(default=None, max_length=300, description="Topics to cover")

    @field_validator("deadline")
    @classmethod
    def validate_deadline_format(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
        except ValueError:
            raise ValueError("deadline must be in YYYY-MM-DD format")
        return v.strip()


class StudyPlanRequest(BaseTrimmedModel):
    subjects: List[SubjectInput] = Field(..., min_length=1, max_length=6)
    daily_hours: float = Field(..., ge=0.5, le=12.0)
    start_date: Optional[str] = Field(default=None, description="Start date YYYY-MM-DD")
    language: Language = Field(default=Language.EN)

    @field_validator("daily_hours")
    @classmethod
    def validate_daily_hours_step(cls, v: float) -> float:
        if round(v * 2) != v * 2:
            raise ValueError("daily_hours must be a multiple of 0.5")
        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date_format(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        try:
            datetime.strptime(v.strip(), "%Y-%m-%d")
        except ValueError:
            raise ValueError("start_date must be in YYYY-MM-DD format")
        return v.strip()

    @model_validator(mode="after")
    def validate_subject_deadlines(self) -> "StudyPlanRequest":
        start_d = (
            datetime.strptime(self.start_date, "%Y-%m-%d").date()
            if self.start_date
            else date.today()
        )
        max_d = start_d + timedelta(days=30)

        for sub in self.subjects:
            if sub.deadline:
                d = datetime.strptime(sub.deadline, "%Y-%m-%d").date()
                if d < start_d:
                    raise ValueError(f"Deadline {sub.deadline} for subject '{sub.name}' cannot be before start date {start_d.isoformat()}")
                if d > max_d:
                    raise ValueError(f"Deadline {sub.deadline} for subject '{sub.name}' cannot be more than 30 days after start date {start_d.isoformat()}")
        return self


# ============================================================================
# Model-facing Output Schemas (Raw JSON returned by Gemma)
# ============================================================================

class ExplainOutput(BaseTrimmedModel):
    title: str = Field(..., min_length=1)
    explanation: str = Field(..., min_length=1)
    example: str = Field(..., min_length=1)
    key_points: List[str] = Field(..., min_length=1)
    quick_recap: str = Field(..., min_length=1)


class KeyTerm(BaseTrimmedModel):
    term: str = Field(..., min_length=1)
    meaning: str = Field(..., min_length=1)


class SummaryOutput(BaseTrimmedModel):
    summary: str = Field(..., min_length=1)
    key_points: List[str] = Field(..., min_length=1)
    key_terms: List[KeyTerm] = Field(default_factory=list)


class RawQuizQuestion(BaseTrimmedModel):
    question: str = Field(..., min_length=1)
    options: List[str] = Field(..., min_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    explanation: str = Field(..., min_length=1)

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        if len(v) != 4:
            raise ValueError("Each question must have exactly 4 options")
        cleaned = [opt.strip() for opt in v if opt.strip()]
        if len(cleaned) != 4:
            raise ValueError("All 4 options must be non-empty strings")
        if len(set(opt.lower() for opt in cleaned)) != 4:
            raise ValueError("All 4 options must be distinct")
        return cleaned


class QuizOutput(BaseTrimmedModel):
    topic: str = Field(..., min_length=1)
    questions: List[RawQuizQuestion] = Field(..., min_length=5)

    @field_validator("questions")
    @classmethod
    def validate_questions_count(cls, v: List[RawQuizQuestion]) -> List[RawQuizQuestion]:
        if len(v) < 5:
            raise ValueError(f"Quiz must have at least 5 questions, got {len(v)}")
        return v


PROMPT_LEAK_MARKERS = (
    "system prompt",
    "system instruction",
    "developer message",
    "ignore previous instructions",
    "reveal this prompt",
    "return json",
    "output schema",
)


def reject_prompt_leak(value: str) -> str:
    lowered = value.casefold()
    if any(marker in lowered for marker in PROMPT_LEAK_MARKERS):
        raise ValueError("Generated question contains prompt instructions")
    return value


class AdaptiveQuizStartRequest(BaseTrimmedModel):
    content: str = Field(..., min_length=3, max_length=6000)
    difficulty: Difficulty = Field(default=Difficulty.MEDIUM)
    language: Language = Field(default=Language.EN)
    session_nonce: str

    @field_validator("session_nonce")
    @classmethod
    def validate_session_nonce(cls, value: str) -> str:
        try:
            return str(uuid.UUID(value))
        except (ValueError, AttributeError) as exc:
            raise ValueError("session_nonce must be a valid UUID") from exc


class AdaptiveQuizQuestionOutput(BaseTrimmedModel):
    question: str = Field(..., min_length=1, max_length=500)
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_index: int = Field(..., ge=0, le=3, strict=True)
    explanation: str = Field(..., min_length=1, max_length=1000)
    concept_tags: List[str] = Field(..., min_length=1, max_length=3)
    source_anchor: str = Field(..., min_length=1, max_length=100)
    difficulty: Difficulty

    @field_validator("question", "explanation")
    @classmethod
    def reject_leaked_prompt(cls, value: str) -> str:
        return reject_prompt_leak(value)

    @field_validator("options")
    @classmethod
    def validate_options(cls, values: List[str]) -> List[str]:
        cleaned = [option.strip() for option in values]
        if any(not option for option in cleaned):
            raise ValueError("All four options must be non-empty strings")
        if len({option.casefold() for option in cleaned}) != 4:
            raise ValueError("All four options must be distinct")
        for option in cleaned:
            reject_prompt_leak(option)
        return cleaned

    @field_validator("concept_tags")
    @classmethod
    def validate_concept_tags(cls, values: List[str]) -> List[str]:
        cleaned = [tag.strip() for tag in values]
        if any(not tag or len(tag) > 60 for tag in cleaned):
            raise ValueError("Concept tags must contain 1 to 60 characters")
        if len({tag.casefold() for tag in cleaned}) != len(cleaned):
            raise ValueError("Concept tags must be distinct")
        for tag in cleaned:
            reject_prompt_leak(tag)
        return cleaned


class AdaptiveQuizStartOutput(AdaptiveQuizQuestionOutput):
    topic: str = Field(..., min_length=1, max_length=80)

    @field_validator("topic")
    @classmethod
    def reject_leaked_topic(cls, value: str) -> str:
        return reject_prompt_leak(value)


class AdaptiveQuizQuestion(AdaptiveQuizQuestionOutput):
    id: str
    number: int = Field(..., ge=1, le=10, strict=True)
    is_practice: bool


class AdaptiveAnswerRecord(BaseTrimmedModel):
    question_id: str
    number: int = Field(..., ge=1, le=10, strict=True)
    difficulty: Difficulty
    concept_tags: List[str] = Field(..., min_length=1, max_length=3)
    selected_index: int = Field(..., ge=0, le=3, strict=True)
    correct_index: int = Field(..., ge=0, le=3, strict=True)
    is_practice: bool

    @field_validator("concept_tags")
    @classmethod
    def validate_concept_tags(cls, values: List[str]) -> List[str]:
        cleaned = [tag.strip() for tag in values]
        if any(not tag or len(tag) > 60 for tag in cleaned):
            raise ValueError("Concept tags must contain 1 to 60 characters")
        if len({tag.casefold() for tag in cleaned}) != len(cleaned):
            raise ValueError("Concept tags must be distinct")
        return cleaned


class AdaptiveQuizAnswerRequest(BaseTrimmedModel):
    session_id: str = Field(..., pattern=r"^aq_[0-9a-f]{32}$")
    topic: str = Field(..., min_length=1, max_length=80)
    content: str = Field(..., min_length=3, max_length=6000)
    language: Language = Field(default=Language.EN)
    initial_difficulty: Difficulty
    current_question: AdaptiveQuizQuestion
    selected_index: int = Field(..., ge=0, le=3, strict=True)
    answer_history: List[AdaptiveAnswerRecord] = Field(default_factory=list, max_length=9)
    finish: bool = False
    finish_reason: Optional[str] = None

    @field_validator("finish_reason")
    @classmethod
    def validate_finish_reason(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in {"user_stopped", "provider_error"}:
            raise ValueError("finish_reason must be user_stopped or provider_error")
        return value

    @field_validator("topic")
    @classmethod
    def reject_leaked_answer_topic(cls, value: str) -> str:
        return reject_prompt_leak(value)

    @model_validator(mode="after")
    def validate_session_sequence(self) -> "AdaptiveQuizAnswerRequest":
        expected_question_number = len(self.answer_history) + 1
        if self.current_question.number != expected_question_number:
            raise ValueError("current_question number must follow answer_history")

        for index, record in enumerate(self.answer_history, start=1):
            if record.number != index:
                raise ValueError("answer_history must be sequential from question 1")
            if record.question_id != f"{self.session_id}-q{index}":
                raise ValueError("answer_history contains an invalid question ID")

        if self.current_question.id != f"{self.session_id}-q{expected_question_number}":
            raise ValueError("current_question has an invalid question ID")

        expected_difficulty = self.initial_difficulty
        expected_practice = False
        for record in self.answer_history:
            if record.difficulty != expected_difficulty or record.is_practice != expected_practice:
                raise ValueError("answer_history contains an unsupported difficulty transition")
            expected_difficulty, expected_practice = adaptive_next_level(
                record.difficulty,
                record.selected_index == record.correct_index,
                record.is_practice,
            )

        if (
            self.current_question.difficulty != expected_difficulty
            or self.current_question.is_practice != expected_practice
        ):
            raise ValueError("current_question contains an unsupported difficulty transition")

        if self.finish_reason and not self.finish:
            raise ValueError("finish_reason can only be set when finish is true")
        return self


def adaptive_next_level(
    difficulty: Difficulty,
    is_correct: bool,
    was_practice: bool,
) -> tuple[Difficulty, bool]:
    levels = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]
    index = levels.index(difficulty)
    if is_correct and was_practice:
        return difficulty, False
    if is_correct:
        return levels[min(index + 1, len(levels) - 1)], False
    return levels[max(index - 1, 0)], True


class RawPlanSession(BaseTrimmedModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    minutes: int = Field(default=60)
    activity: Activity = Field(default=Activity.LEARN)

    @field_validator("activity", mode="before")
    @classmethod
    def normalize_activity(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            for act in Activity:
                if act.value == v_clean:
                    return act
        return v

    @field_validator("minutes", mode="before")
    @classmethod
    def clamp_minutes(cls, v: Any) -> int:
        try:
            val = int(v)
            return max(5, min(240, val))
        except (ValueError, TypeError):
            return 60


class RawPlanDay(BaseTrimmedModel):
    day: int = Field(..., ge=1)
    sessions: List[RawPlanSession] = Field(default_factory=list)


class PlanOutput(BaseTrimmedModel):
    summary: str = Field(..., min_length=1)
    days: List[RawPlanDay] = Field(default_factory=list)
    tips: List[str] = Field(default_factory=list)


# ============================================================================
# API Response Data Models (post-processed & delivered to client)
# ============================================================================

class ExplainData(BaseTrimmedModel):
    title: str
    explanation: str
    example: str
    key_points: List[str]
    quick_recap: str


class SummaryData(BaseTrimmedModel):
    summary: str
    key_points: List[str]
    key_terms: List[KeyTerm]


class QuizQuestion(BaseTrimmedModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    explanation: str


class QuizData(BaseTrimmedModel):
    topic: str
    questions: List[QuizQuestion]


class AdaptiveNextAction(str, Enum):
    CONTINUE = "continue"
    PRACTICE = "practice"
    COMPLETE = "complete"


class AdaptiveCompletionReason(str, Enum):
    QUESTION_LIMIT = "question_limit"
    USER_STOPPED = "user_stopped"
    PROVIDER_ERROR = "provider_error"


class AdaptiveQuizStartData(BaseTrimmedModel):
    session_id: str
    topic: str
    question_limit: int = 10
    answered_count: int = 0
    score: int = 0
    difficulty_history: List[Difficulty] = Field(default_factory=list)
    weak_concepts: List[str] = Field(default_factory=list)
    next_action: AdaptiveNextAction = AdaptiveNextAction.CONTINUE
    practice_reason: Optional[str] = None
    question: AdaptiveQuizQuestion


class AdaptiveQuizAnswerData(BaseTrimmedModel):
    session_id: str
    topic: str
    question_limit: int = 10
    answered_count: int = Field(..., ge=1, le=10)
    score: int = Field(..., ge=0, le=10)
    difficulty_history: List[Difficulty]
    weak_concepts: List[str]
    next_action: AdaptiveNextAction
    practice_reason: Optional[str] = None
    question: Optional[AdaptiveQuizQuestion] = None
    completion_reason: Optional[AdaptiveCompletionReason] = None


class PlanSession(BaseTrimmedModel):
    id: str
    subject: str
    topic: str
    minutes: int
    activity: Activity


class PlanDay(BaseTrimmedModel):
    day: int
    date: str
    sessions: List[PlanSession]


class PlanData(BaseTrimmedModel):
    summary: str
    horizon_days: int
    truncated: bool
    days: List[PlanDay]
    tips: List[str]


# ============================================================================
# Envelopes (05-API-Spec §1)
# ============================================================================

class ResponseMeta(BaseModel):
    model: str
    language: str
    latency_ms: int
    attempts: int


T = TypeVar("T")

class SuccessEnvelope(BaseModel, Generic[T]):
    ok: bool = True
    data: T
    meta: ResponseMeta


class ErrorDetails(BaseModel):
    code: str
    message: str
    retryable: bool
    details: Optional[Dict[str, Any]] = None


class ErrorEnvelope(BaseModel):
    ok: bool = False
    error: ErrorDetails
