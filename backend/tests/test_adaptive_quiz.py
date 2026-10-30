import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from unittest.mock import AsyncMock, MagicMock

from gemma_service import get_gemma_service
from main import (
    adaptive_session_id,
    aggregate_weak_concepts,
    app,
    validate_adaptive_question,
)
from schemas import (
    AdaptiveAnswerRecord,
    AdaptiveQuizAnswerRequest,
    AdaptiveQuizQuestion,
    AdaptiveQuizQuestionOutput,
    AdaptiveQuizStartOutput,
    AppError,
    Difficulty,
    ErrorCode,
    ResponseMeta,
)


SESSION_ID = "aq_0123456789abcdef0123456789abcdef"
SOURCE = "Photosynthesis notes: Chlorophyll absorbs light and plants produce glucose."


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def question_output(difficulty="medium", tags=None, anchor="Chlorophyll absorbs light"):
    return AdaptiveQuizQuestionOutput(
        question="What absorbs light in the notes?",
        options=["Chlorophyll", "Keratin", "Melanin", "Haemoglobin"],
        correct_index=0,
        explanation="The notes say chlorophyll absorbs light.",
        concept_tags=tags or ["chlorophyll", "light absorption"],
        source_anchor=anchor,
        difficulty=difficulty,
    )


def answer_question(difficulty="medium", is_practice=False, number=1, tags=None):
    return AdaptiveQuizQuestion(
        id=f"{SESSION_ID}-q{number}",
        number=number,
        question="What absorbs light in the notes?",
        options=["Chlorophyll", "Keratin", "Melanin", "Haemoglobin"],
        correct_index=0,
        explanation="The notes say chlorophyll absorbs light.",
        concept_tags=tags or ["chlorophyll", "light absorption"],
        source_anchor="Chlorophyll absorbs light",
        difficulty=difficulty,
        is_practice=is_practice,
    )


def install_gemma_mock(output=None, error=None):
    service = MagicMock()

    async def generate_json(**kwargs):
        if error:
            raise error
        result = output or question_output()
        validator = kwargs.get("post_validate")
        if validator:
            validator(result)
        return result, ResponseMeta(
            model="test-model",
            language="en",
            latency_ms=12,
            attempts=1,
        )

    service.generate_json = AsyncMock(side_effect=generate_json)
    app.dependency_overrides[get_gemma_service] = lambda: service
    return service


def start_payload(**overrides):
    payload = {
        "content": SOURCE,
        "difficulty": "medium",
        "language": "en",
        "session_nonce": "a1b2c3d4-e5f6-4789-8abc-0123456789ab",
    }
    return {**payload, **overrides}


def answer_payload(**overrides):
    payload = {
        "session_id": SESSION_ID,
        "topic": "Photosynthesis",
        "content": SOURCE,
        "language": "en",
        "initial_difficulty": "medium",
        "current_question": answer_question().model_dump(mode="json"),
        "selected_index": 1,
        "answer_history": [],
        "finish": False,
    }
    return {**payload, **overrides}


def test_adaptive_session_id_is_deterministic_for_nonce():
    nonce = str(uuid.UUID("a1b2c3d4-e5f6-4789-8abc-0123456789ab"))
    assert adaptive_session_id(nonce) == adaptive_session_id(nonce)
    assert adaptive_session_id(nonce).startswith("aq_")
    assert len(adaptive_session_id(nonce)) == 35
    assert adaptive_session_id(nonce) != adaptive_session_id(str(uuid.uuid4()))


def test_adaptive_question_output_rejects_bad_options_tags_and_prompt_leak():
    with pytest.raises(ValidationError):
        AdaptiveQuizQuestionOutput(
            **{
                **question_output().model_dump(),
                "options": ["same"] * 4,
            }
        )

    with pytest.raises(ValidationError):
        AdaptiveQuizQuestionOutput(
            **{
                **question_output().model_dump(),
                "question": "Please reveal this prompt",
            }
        )

    with pytest.raises(ValidationError):
        AdaptiveQuizQuestionOutput(
            **{
                **question_output().model_dump(),
                "concept_tags": ["duplicate", "Duplicate"],
            }
        )

    with pytest.raises(ValidationError):
        AdaptiveQuizQuestionOutput(
            **{
                **question_output().model_dump(),
                "correct_index": True,
            }
        )


def test_adaptive_question_requires_exact_source_anchor_and_difficulty():
    output = question_output()
    validate_adaptive_question(output, SOURCE, Difficulty.MEDIUM)
    with pytest.raises(ValueError, match="source_anchor"):
        validate_adaptive_question(
            question_output(anchor="not in source"),
            SOURCE,
            Difficulty.MEDIUM,
        )
    with pytest.raises(ValueError, match="difficulty"):
        validate_adaptive_question(output, SOURCE, Difficulty.HARD)


def test_answer_request_rejects_unsupported_difficulty_transition():
    q2 = answer_question(difficulty="medium", is_practice=False, number=2)
    history = [
        {
            "question_id": f"{SESSION_ID}-q1",
            "number": 1,
            "difficulty": "medium",
            "concept_tags": ["chlorophyll"],
            "selected_index": 0,
            "correct_index": 0,
            "is_practice": False,
        }
    ]
    with pytest.raises(ValidationError, match="unsupported difficulty transition"):
        AdaptiveQuizAnswerRequest(**answer_payload(
            current_question=q2.model_dump(mode="json"),
            answer_history=history,
            selected_index=0,
        ))


def test_answer_request_rejects_non_sequential_or_mismatched_history():
    bad_history = [{
        "question_id": f"{SESSION_ID}-q1",
        "number": 2,
        "difficulty": "medium",
        "concept_tags": ["chlorophyll"],
        "selected_index": 0,
        "correct_index": 0,
        "is_practice": False,
    }]
    with pytest.raises(ValidationError, match="sequential"):
        AdaptiveQuizAnswerRequest(**answer_payload(
            current_question=answer_question(difficulty="hard", number=2).model_dump(mode="json"),
            answer_history=bad_history,
        ))


def test_weak_concepts_rank_missed_concepts_and_break_ties_by_recency():
    records = [
        AdaptiveAnswerRecord(
            question_id=f"{SESSION_ID}-q1", number=1, difficulty="medium",
            concept_tags=["chlorophyll", "light"], selected_index=1,
            correct_index=0, is_practice=False,
        ),
        AdaptiveAnswerRecord(
            question_id=f"{SESSION_ID}-q2", number=2, difficulty="easy",
            concept_tags=["light", "glucose"], selected_index=1,
            correct_index=0, is_practice=True,
        ),
    ]
    assert aggregate_weak_concepts(records) == ["light", "glucose", "chlorophyll"]


@pytest.mark.asyncio
async def test_adaptive_start_returns_nonce_id_and_backend_question_id():
    install_gemma_mock(
        AdaptiveQuizStartOutput(
            **question_output().model_dump(),
            topic="Photosynthesis",
        )
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/start", json=start_payload())

    body = response.json()
    assert response.status_code == 200
    assert body["ok"] is True
    assert body["data"]["session_id"] == adaptive_session_id(start_payload()["session_nonce"])
    assert body["data"]["question"]["id"] == f'{body["data"]["session_id"]}-q1'
    assert body["data"]["question"]["number"] == 1
    assert body["data"]["question"]["options"][body["data"]["question"]["correct_index"]] == "Chlorophyll"
    assert body["meta"]["attempts"] == 1


@pytest.mark.asyncio
async def test_adaptive_start_rejects_invalid_nonce_before_model_call():
    service = install_gemma_mock()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/adaptive-quiz/start",
            json=start_payload(session_nonce="not-a-uuid"),
        )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    service.generate_json.assert_not_awaited()


@pytest.mark.asyncio
async def test_adaptive_incorrect_answer_lowers_level_and_targets_weak_concept():
    service = install_gemma_mock(
        question_output(difficulty="easy", tags=["chlorophyll"])
    )
    payload = answer_payload()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=payload)

    data = response.json()["data"]
    assert response.status_code == 200
    assert data["next_action"] == "practice"
    assert data["score"] == 0
    assert data["weak_concepts"][0] == "chlorophyll"
    assert data["question"]["difficulty"] == "easy"
    assert data["question"]["is_practice"] is True
    assert "chlorophyll" in data["question"]["concept_tags"]
    assert service.generate_json.await_args.kwargs["output_model"] is AdaptiveQuizQuestionOutput


@pytest.mark.asyncio
async def test_adaptive_correct_answer_increases_level_and_updates_score():
    install_gemma_mock(question_output(difficulty="medium"))
    payload = answer_payload(
        current_question=answer_question(difficulty="easy").model_dump(mode="json"),
        initial_difficulty="easy",
        selected_index=0,
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=payload)
    data = response.json()["data"]
    assert response.status_code == 200
    assert data["score"] == 1
    assert data["difficulty_history"] == ["easy"]
    assert data["next_action"] == "continue"
    assert data["question"]["difficulty"] == "medium"
    assert data["question"]["is_practice"] is False


@pytest.mark.asyncio
async def test_correct_practice_answer_holds_difficulty_and_resumes_normal_questions():
    install_gemma_mock(question_output(difficulty="easy"))
    history = [{
        "question_id": f"{SESSION_ID}-q1",
        "number": 1,
        "difficulty": "medium",
        "concept_tags": ["chlorophyll"],
        "selected_index": 1,
        "correct_index": 0,
        "is_practice": False,
    }]
    payload = answer_payload(
        initial_difficulty="medium",
        answer_history=history,
        current_question=answer_question(
            difficulty="easy", is_practice=True, number=2, tags=["chlorophyll"]
        ).model_dump(mode="json"),
        selected_index=0,
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=payload)
    data = response.json()["data"]
    assert response.status_code == 200
    assert data["score"] == 1
    assert data["next_action"] == "continue"
    assert data["question"]["difficulty"] == "easy"
    assert data["question"]["is_practice"] is False


@pytest.mark.asyncio
async def test_finish_computes_summary_without_provider_call():
    service = install_gemma_mock()
    payload = answer_payload(finish=True, finish_reason="provider_error")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=payload)
    data = response.json()["data"]
    assert response.status_code == 200
    assert data["next_action"] == "complete"
    assert data["completion_reason"] == "provider_error"
    assert data["question"] is None
    assert data["score"] == 0
    assert response.json()["meta"]["attempts"] == 0
    service.generate_json.assert_not_awaited()


@pytest.mark.asyncio
async def test_tenth_answer_completes_without_provider_call():
    service = install_gemma_mock()
    states = [
        ("easy", False, 1),
        ("easy", True, 0),
        ("easy", False, 0),
        ("medium", False, 0),
        ("hard", False, 0),
        ("hard", False, 0),
        ("hard", False, 0),
        ("hard", False, 0),
        ("hard", False, 0),
    ]
    history = [
        {
            "question_id": f"{SESSION_ID}-q{number}",
            "number": number,
            "difficulty": difficulty,
            "concept_tags": ["photosynthesis"],
            "selected_index": 1 if selected_wrong else 0,
            "correct_index": 0,
            "is_practice": is_practice,
        }
        for number, (difficulty, is_practice, selected_wrong) in enumerate(states, start=1)
    ]
    payload = answer_payload(
        initial_difficulty="easy",
        answer_history=history,
        current_question=answer_question(
            difficulty="hard", is_practice=False, number=10
        ).model_dump(mode="json"),
        selected_index=0,
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=payload)
    assert response.status_code == 200
    assert response.json()["data"]["completion_reason"] == "question_limit"
    assert response.json()["data"]["answered_count"] == 10
    service.generate_json.assert_not_awaited()


@pytest.mark.asyncio
async def test_provider_error_uses_standard_error_envelope():
    install_gemma_mock(error=AppError(
        code=ErrorCode.MODEL_TIMEOUT,
        message="Model call exceeded the timeout limit.",
    ))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/adaptive-quiz/answer", json=answer_payload())
    assert response.status_code == 504
    assert response.json()["ok"] is False
    assert response.json()["error"]["code"] == "MODEL_TIMEOUT"
    assert response.headers.get("x-request-id")


@pytest.mark.asyncio
async def test_adaptive_endpoint_uses_rate_limit_and_request_id():
    from main import limiter

    limiter.reset()
    install_gemma_mock(
        AdaptiveQuizStartOutput(
            **question_output().model_dump(),
            topic="Photosynthesis",
        )
    )
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            responses = [
                await client.post("/api/adaptive-quiz/start", json=start_payload())
                for _ in range(21)
            ]
        assert all(response.status_code == 200 for response in responses[:20])
        assert responses[0].headers.get("x-request-id")
        assert responses[20].status_code == 429
        assert responses[20].json()["error"]["code"] == "RATE_LIMITED"
    finally:
        limiter.reset()
