from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any, Generic, TypeVar
from datetime import date, datetime, timedelta
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
        if not v:
            return None
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Deadline must be in YYYY-MM-DD format")
        return v


class StudyPlanRequest(BaseTrimmedModel):
    subjects: List[SubjectInput] = Field(..., min_length=1, max_length=6)
    daily_hours: float = Field(..., ge=0.5, le=12.0)
    start_date: Optional[str] = Field(default=None, description="Start date YYYY-MM-DD")
    language: Language = Field(default=Language.EN)

    @field_validator("daily_hours")
    @classmethod
    def validate_daily_hours_step(cls, v: float) -> float:
        # daily_hours in 0.5..12, step 0.5
        if round(v * 2) != v * 2:
            raise ValueError("daily_hours must be a multiple of 0.5")
        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date_format(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("start_date must be in YYYY-MM-DD format")
        return v

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


class QuizOutput(BaseTrimmedModel):
    topic: str = Field(..., min_length=1)
    questions: List[RawQuizQuestion] = Field(..., min_length=5)


class RawPlanSession(BaseTrimmedModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    minutes: int = Field(..., ge=5, le=240)
    activity: Activity = Field(default=Activity.LEARN)


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
