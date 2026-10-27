import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from main import app
from gemma_service import get_gemma_service
from schemas import (
    ExplainOutput,
    SummaryOutput,
    KeyTerm,
    QuizOutput,
    RawQuizQuestion,
    PlanOutput,
    RawPlanDay,
    RawPlanSession,
    Activity,
    ResponseMeta,
    AppError,
    ErrorCode,
)


@pytest.fixture(autouse=True)
def clean_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_meta():
    return ResponseMeta(
        model="gemma-4-26b-a4b-it",
        language="en",
        latency_ms=350,
        attempts=1,
    )


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "ai_configured" in data
        assert "model" in data
        assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_explain_endpoint_success(mock_meta):
    mock_service = MagicMock()
    mock_output = ExplainOutput(
        title="Newton's First Law",
        explanation="An object stays at rest unless acted on by an unbalanced force.",
        example="A soccer ball remains still on the grass until kicked.",
        key_points=[
            "Point 1",
            "Point 2",
            "Point 3",
            "Point 4",
            "Point 5",
            "Point 6 (should be clamped)",
        ],
        quick_recap="Inertia keeps things doing what they are doing.",
    )
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/explain",
                json={"topic": "Newton's first law", "level": "beginner", "language": "en"},
            )
            assert res.status_code == 200
            body = res.json()
            assert body["ok"] is True
            assert body["data"]["title"] == "Newton's First Law"
            # Clamped to 5 points
            assert len(body["data"]["key_points"]) == 5
            assert body["meta"]["attempts"] == 1
            assert "X-Request-Id" in res.headers


@pytest.mark.asyncio
async def test_explain_validation_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Topic too short (< 3)
        res = await client.post("/api/explain", json={"topic": "a"})
        assert res.status_code == 422
        body = res.json()
        assert body["ok"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert body["error"]["retryable"] is False
        assert body["error"]["details"]["field"] == "topic"


@pytest.mark.asyncio
async def test_summarize_endpoint_success(mock_meta):
    mock_service = MagicMock()
    mock_output = SummaryOutput(
        summary="Mitochondria are the powerhouses of the cell.",
        key_points=[f"Point {i}" for i in range(10)],  # should be clamped to 7
        key_terms=[
            KeyTerm(term=f"Term {i}", meaning=f"Meaning {i}") for i in range(8)
        ],  # clamped to 6
    )
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/summarize",
                json={
                    "notes": "Mitochondria produce ATP through cellular respiration which powers cells." + " extra words" * 10,
                    "length": "short",
                },
            )
            assert res.status_code == 200
            body = res.json()
            assert body["ok"] is True
            assert len(body["data"]["key_points"]) == 7
            assert len(body["data"]["key_terms"]) == 6


@pytest.mark.asyncio
async def test_summarize_validation_error_length():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Notes too short (< 50)
        res = await client.post("/api/summarize", json={"notes": "Too short"})
        assert res.status_code == 422
        body = res.json()
        assert body["ok"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_quiz_endpoint_success_and_shuffle(mock_meta):
    mock_service = MagicMock()
    # 5 raw questions where correct option is always the first one (index 0)
    raw_questions = [
        RawQuizQuestion(
            question=f"Question {i}?",
            options=["CorrectAnswer", "Wrong1", "Wrong2", "Wrong3"],
            correct_index=0,
            explanation=f"Explanation {i}",
        )
        for i in range(5)
    ]
    mock_output = QuizOutput(topic="Cell Biology", questions=raw_questions)
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/quiz",
                json={"content": "Cell Biology notes", "difficulty": "medium"},
            )
            assert res.status_code == 200
            body = res.json()
            assert body["ok"] is True
            questions = body["data"]["questions"]
            assert len(questions) == 5

            for idx, q in enumerate(questions):
                assert q["id"] == f"q{idx + 1}"
                assert len(q["options"]) == 4
                # Verify correct_index accurately points to "CorrectAnswer" after shuffle
                c_idx = q["correct_index"]
                assert q["options"][c_idx] == "CorrectAnswer"


@pytest.mark.asyncio
async def test_study_plan_endpoint_success(mock_meta):
    today = date.today()
    start_str = today.isoformat()
    d1_str = (today + timedelta(days=2)).isoformat()  # 3 days total horizon

    mock_service = MagicMock()
    mock_output = PlanOutput(
        summary="Focus on Physics first.",
        days=[
            RawPlanDay(
                day=1,
                sessions=[
                    RawPlanSession(
                        subject="Physics",
                        topic="Circuits",
                        minutes=60,
                        activity=Activity.LEARN,
                    )
                ],
            ),
            # Day 2 is missing from model (should be filled with rest day)
            RawPlanDay(
                day=3,
                sessions=[
                    RawPlanSession(
                        subject="Physics",
                        topic="Numericals",
                        minutes=60,
                        activity=Activity.PRACTICE,
                    ),
                    # Session on day 3 after subject's deadline on day 2 should be dropped
                    RawPlanSession(
                        subject="Maths",
                        topic="Algebra",
                        minutes=45,
                        activity=Activity.REVISE,
                    ),
                ],
            ),
            # Day 4 is outside horizon (should be dropped)
            RawPlanDay(
                day=4,
                sessions=[
                    RawPlanSession(
                        subject="Physics",
                        topic="Beyond",
                        minutes=60,
                        activity=Activity.TEST,
                    )
                ],
            ),
        ],
        tips=["Tip 1", "Tip 2", "Tip 3"],
    )
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/study-plan",
                json={
                    "subjects": [
                        {"name": "Physics", "deadline": d1_str},
                        {"name": "Maths", "deadline": (today + timedelta(days=1)).isoformat()},
                    ],
                    "daily_hours": 2.0,
                    "start_date": start_str,
                },
            )
            assert res.status_code == 200
            body = res.json()
            assert body["ok"] is True
            data = body["data"]
            assert data["horizon_days"] == 3
            assert data["truncated"] is False
            assert len(data["days"]) == 3

            # Day 1 has circuits
            assert data["days"][0]["day"] == 1
            assert data["days"][0]["date"] == start_str
            assert len(data["days"][0]["sessions"]) == 1
            assert data["days"][0]["sessions"][0]["id"] == "d1-s1"

            # Day 2 was missing, so rest day
            assert data["days"][1]["day"] == 2
            assert len(data["days"][1]["sessions"]) == 0

            # Day 3: Maths deadline was day 2, so Maths session dropped; Physics kept
            assert data["days"][2]["day"] == 3
            assert len(data["days"][2]["sessions"]) == 1
            assert data["days"][2]["sessions"][0]["subject"] == "Physics"


@pytest.mark.asyncio
async def test_study_plan_horizon_no_deadlines(mock_meta):
    mock_service = MagicMock()
    mock_output = PlanOutput(
        summary="Balanced plan",
        days=[],
        tips=["Study hard"],
    )
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/study-plan",
                json={
                    "subjects": [{"name": "Chemistry"}],
                    "daily_hours": 1.0,
                },
            )
            assert res.status_code == 200
            body = res.json()
            assert body["data"]["horizon_days"] == 7
            assert body["data"]["truncated"] is False


@pytest.mark.asyncio
async def test_study_plan_truncated_horizon(mock_meta):
    today = date.today()
    far_deadline = (today + timedelta(days=25)).isoformat()

    mock_service = MagicMock()
    mock_output = PlanOutput(summary="Plan", days=[], tips=[])
    mock_service.generate_json = AsyncMock(return_value=(mock_output, mock_meta))

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/study-plan",
                json={
                    "subjects": [{"name": "Biology", "deadline": far_deadline}],
                    "daily_hours": 2.0,
                    "start_date": today.isoformat(),
                },
            )
            assert res.status_code == 200
            body = res.json()
            assert body["data"]["horizon_days"] == 14
            assert body["data"]["truncated"] is True


@pytest.mark.asyncio
async def test_unsuitable_input_error_response():
    mock_service = MagicMock()
    mock_service.generate_json = AsyncMock(
        side_effect=AppError(
            code=ErrorCode.UNSUITABLE_INPUT,
            message="Input text cannot be used for study purposes.",
            retryable=False,
        )
    )

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/explain", json={"topic": "asdf qwer zxcv"})
            assert res.status_code == 422
            body = res.json()
            assert body["ok"] is False
            assert body["error"]["code"] == "UNSUITABLE_INPUT"
            assert body["error"]["retryable"] is False


@pytest.mark.asyncio
async def test_model_unavailable_error_response():
    mock_service = MagicMock()
    mock_service.generate_json = AsyncMock(
        side_effect=AppError(
            code=ErrorCode.MODEL_UNAVAILABLE,
            message="Gemini API key is not configured.",
            retryable=True,
        )
    )

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/explain", json={"topic": "Gravity"})
            assert res.status_code == 503
            body = res.json()
            assert body["ok"] is False
            assert body["error"]["code"] == "MODEL_UNAVAILABLE"
            assert body["error"]["retryable"] is True


@pytest.mark.asyncio
async def test_model_timeout_error_response():
    mock_service = MagicMock()
    mock_service.generate_json = AsyncMock(
        side_effect=AppError(
            code=ErrorCode.MODEL_TIMEOUT,
            message="Model call exceeded the timeout limit.",
            retryable=True,
        )
    )

    with patch("main.get_gemma_service", return_value=mock_service):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/explain", json={"topic": "Quantum physics"})
            assert res.status_code == 504
            body = res.json()
            assert body["ok"] is False
            assert body["error"]["code"] == "MODEL_TIMEOUT"
            assert body["error"]["retryable"] is True


@pytest.mark.asyncio
async def test_cors_headers():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
