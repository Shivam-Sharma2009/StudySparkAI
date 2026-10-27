import pytest
from datetime import date, timedelta
from pydantic import ValidationError
from schemas import (
    Language,
    Level,
    Length,
    Difficulty,
    Activity,
    ErrorCode,
    AppError,
    ERROR_HTTP_STATUS,
    ERROR_RETRYABLE,
    ExplainRequest,
    SummarizeRequest,
    QuizRequest,
    SubjectInput,
    StudyPlanRequest,
    ExplainOutput,
    SummaryOutput,
    KeyTerm,
    RawQuizQuestion,
    QuizOutput,
    RawPlanSession,
    RawPlanDay,
    PlanOutput,
    SuccessEnvelope,
    ErrorEnvelope,
    ResponseMeta,
)


def test_enums():
    assert Language.EN.value == "en"
    assert Language.HI.value == "hi"
    assert Level.BEGINNER.value == "beginner"
    assert Length.SHORT.value == "short"
    assert Difficulty.EASY.value == "easy"
    assert Activity.LEARN.value == "learn"
    assert ErrorCode.VALIDATION_ERROR.value == "VALIDATION_ERROR"
    assert ERROR_HTTP_STATUS[ErrorCode.VALIDATION_ERROR] == 422
    assert ERROR_RETRYABLE[ErrorCode.VALIDATION_ERROR] is False
    assert ERROR_RETRYABLE[ErrorCode.RATE_LIMITED] is True


def test_explain_request_validation():
    # Valid
    req = ExplainRequest(topic="Photosynthesis")
    assert req.topic == "Photosynthesis"
    assert req.level == Level.BEGINNER
    assert req.language == Language.EN

    # Topic too short (< 3)
    with pytest.raises(ValidationError):
        ExplainRequest(topic="ab")

    # Topic too long (> 500)
    with pytest.raises(ValidationError):
        ExplainRequest(topic="a" * 501)

    # Whitespace stripping
    req2 = ExplainRequest(topic="   Ohm's law   ")
    assert req2.topic == "Ohm's law"


def test_summarize_request_validation():
    # Valid (50 chars)
    notes_50 = "A" * 50
    req = SummarizeRequest(notes=notes_50)
    assert req.notes == notes_50
    assert req.length == Length.SHORT
    assert req.language == Language.EN

    # Too short (< 50)
    with pytest.raises(ValidationError):
        SummarizeRequest(notes="A" * 49)

    # Too long (> 8000)
    with pytest.raises(ValidationError):
        SummarizeRequest(notes="A" * 8001)


def test_quiz_request_validation():
    # Valid
    req = QuizRequest(content="Newton's Laws of Motion")
    assert req.content == "Newton's Laws of Motion"
    assert req.difficulty == Difficulty.MEDIUM
    assert req.language == Language.EN

    # Too short (< 3)
    with pytest.raises(ValidationError):
        QuizRequest(content="hi")

    # Too long (> 6000)
    with pytest.raises(ValidationError):
        QuizRequest(content="x" * 6001)


def test_study_plan_request_validation():
    today = date.today()
    start_str = today.isoformat()
    d1 = (today + timedelta(days=3)).isoformat()
    d2 = (today + timedelta(days=5)).isoformat()

    # Valid
    req = StudyPlanRequest(
        subjects=[
            SubjectInput(name="Physics", deadline=d1, topics="Electricity"),
            SubjectInput(name="Maths", deadline=d2),
        ],
        daily_hours=2.5,
        start_date=start_str,
    )
    assert len(req.subjects) == 2
    assert req.daily_hours == 2.5

    # Empty subjects (< 1)
    with pytest.raises(ValidationError):
        StudyPlanRequest(subjects=[], daily_hours=2.0)

    # Too many subjects (> 6)
    with pytest.raises(ValidationError):
        StudyPlanRequest(
            subjects=[SubjectInput(name=f"Sub {i}") for i in range(7)],
            daily_hours=2.0,
        )

    # Invalid daily_hours (not step of 0.5)
    with pytest.raises(ValidationError):
        StudyPlanRequest(
            subjects=[SubjectInput(name="Physics")],
            daily_hours=2.3,
        )

    # Invalid daily_hours (< 0.5)
    with pytest.raises(ValidationError):
        StudyPlanRequest(
            subjects=[SubjectInput(name="Physics")],
            daily_hours=0.0,
        )

    # Deadline before start date
    past_d = (today - timedelta(days=1)).isoformat()
    with pytest.raises(ValidationError):
        StudyPlanRequest(
            subjects=[SubjectInput(name="Physics", deadline=past_d)],
            daily_hours=2.0,
            start_date=start_str,
        )

    # Deadline > start date + 30 days
    far_d = (today + timedelta(days=31)).isoformat()
    with pytest.raises(ValidationError):
        StudyPlanRequest(
            subjects=[SubjectInput(name="Physics", deadline=far_d)],
            daily_hours=2.0,
            start_date=start_str,
        )


def test_model_facing_output_schemas():
    # ExplainOutput
    exp = ExplainOutput(
        title="Title",
        explanation="Exp text",
        example="Example text",
        key_points=["Point 1", "Point 2"],
        quick_recap="Recap text",
    )
    assert exp.title == "Title"

    # SummaryOutput
    summ = SummaryOutput(
        summary="Summary text",
        key_points=["p1", "p2"],
        key_terms=[KeyTerm(term="Chlorophyll", meaning="Pigment")],
    )
    assert len(summ.key_terms) == 1

    # RawQuizQuestion options count & duplicate check
    q_valid = RawQuizQuestion(
        question="What is 2+2?",
        options=["1", "2", "3", "4"],
        correct_index=3,
        explanation="2+2=4",
    )
    assert q_valid.correct_index == 3

    # Less than 4 options
    with pytest.raises(ValidationError):
        RawQuizQuestion(
            question="What is 2+2?",
            options=["1", "2", "3"],
            correct_index=1,
            explanation="Explanation",
        )

    # Duplicate options
    with pytest.raises(ValidationError):
        RawQuizQuestion(
            question="What is 2+2?",
            options=["1", "2", "2", "4"],
            correct_index=0,
            explanation="Explanation",
        )

    # QuizOutput with < 5 questions rejected
    with pytest.raises(ValidationError):
        QuizOutput(
            topic="Math",
            questions=[q_valid] * 4,
        )

    # QuizOutput with 5 questions accepted
    quiz_out = QuizOutput(
        topic="Math",
        questions=[q_valid] * 5,
    )
    assert len(quiz_out.questions) == 5

    # RawPlanSession minutes clamped to 5..240
    session = RawPlanSession(
        subject="Physics",
        topic="Mechanics",
        minutes=300,
        activity=Activity.LEARN,
    )
    assert session.minutes == 240

    session_low = RawPlanSession(
        subject="Physics",
        topic="Mechanics",
        minutes=1,
        activity=Activity.LEARN,
    )
    assert session_low.minutes == 5


def test_envelopes_and_app_error():
    err = AppError(
        code=ErrorCode.VALIDATION_ERROR,
        message="Topic too short",
        details={"field": "topic"},
    )
    assert err.code == ErrorCode.VALIDATION_ERROR
    assert err.status_code == 422
    assert err.retryable is False

    err_env = ErrorEnvelope(
        ok=False,
        error={
            "code": err.code.value,
            "message": err.message,
            "retryable": err.retryable,
            "details": err.details,
        },
    )
    assert err_env.ok is False
    assert err_env.error.code == "VALIDATION_ERROR"
    assert err_env.error.details["field"] == "topic"

    success_env = SuccessEnvelope(
        ok=True,
        data={"result": "good"},
        meta=ResponseMeta(
            model="gemma-4-26b-a4b-it",
            language="en",
            latency_ms=120,
            attempts=1,
        ),
    )
    assert success_env.ok is True
    assert success_env.meta.latency_ms == 120
