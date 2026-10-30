import pytest
from prompts import (
    LANGUAGE_NAMES,
    SYSTEM_BASE,
    REPAIR_TEMPLATE,
    get_system_prompt,
    build_explain_prompt,
    build_summary_prompt,
    build_quiz_prompt,
    build_plan_prompt,
    build_adaptive_start_prompt,
    build_adaptive_answer_prompt,
    build_repair_message,
)


def test_language_names():
    assert LANGUAGE_NAMES["en"] == "English"
    assert LANGUAGE_NAMES["hi"] == "Hindi (Devanagari script)"


def test_system_prompt_languages():
    sys_en = get_system_prompt("en")
    assert "English" in sys_en
    assert "You are StudySpark" in sys_en
    assert '{"error": "short reason in English"}' in sys_en

    sys_hi = get_system_prompt("hi")
    assert "Hindi (Devanagari script)" in sys_hi
    assert '{"error": "short reason in Hindi (Devanagari script)"}' in sys_hi


def test_build_explain_prompt():
    system, user = build_explain_prompt(topic="Ohm's law", level="beginner", language="en")
    assert "English" in system
    assert "<topic>\nOhm's law\n</topic>" in user
    assert "Task: Explain the topic below for a beginner student." in user
    assert '"title": "short title"' in user
    assert '"quick_recap": "one sentence"' in user


def test_build_summary_prompt():
    notes = "Photosynthesis takes place in chloroplasts."
    system, user = build_summary_prompt(notes=notes, length="short", language="hi")
    assert "Hindi (Devanagari script)" in system
    assert f"<notes>\n{notes}\n</notes>" in user
    assert "Length: short" in user
    assert "key_terms may have 0 to 6 items" in user


def test_build_quiz_prompt():
    content = "Photosynthesis and cellular respiration"
    system, user = build_quiz_prompt(content=content, difficulty="easy", language="en")
    assert f"<material>\n{content}\n</material>" in user
    assert "difficulty from the study material below" in user
    assert "easy: direct recall" in user
    assert "Exactly 4 options per question, exactly one correct." in user


def test_build_plan_prompt():
    subject_lines = "- Physics (deadline_day 4)\n- Maths (no deadline)"
    subjects_detail = "- Physics: Electricity basics\n- Maths: General"
    system, user = build_plan_prompt(
        horizon_days=5,
        daily_minutes=180,
        subject_lines=subject_lines,
        subjects_detail=subjects_detail,
        language="en",
    )
    assert "- Number of days to plan: 5" in user
    assert "- Study time available per day: 180 minutes." in user
    assert subject_lines in user
    assert f"<subjects_detail>\n{subjects_detail}\n</subjects_detail>" in user
    assert "activity must be one of: learn, practice, revise, test." in user


def test_build_repair_message():
    msg = build_repair_message("quiz must have exactly 5 questions with 4 options each")
    assert "Your previous reply was not valid." in msg
    assert "quiz must have exactly 5 questions with 4 options each" in msg


def test_adaptive_start_prompt_uses_language_and_source_boundary():
    source = "Plants use chlorophyll to absorb light."
    system, user = build_adaptive_start_prompt(source, "medium", "hi")
    assert "Hindi (Devanagari script)" in system
    assert f"<material>\n{source}\n</material>" in user
    assert "exact substring" in user
    assert '"source_anchor": "exact phrase from the material"' in user
    assert '"difficulty": "medium"' in user


def test_adaptive_answer_prompt_includes_validated_history_and_target():
    source = "Plants use chlorophyll to absorb light."
    question = {"question": "What absorbs light?", "correct_index": 0}
    history = [{"number": 1, "selected_index": 2, "correct_index": 0}]
    system, user = build_adaptive_answer_prompt(
        content=source,
        current_question=question,
        selected_index=2,
        answer_history=history,
        next_difficulty="easy",
        target_concept="chlorophyll",
        is_practice=True,
        language="en",
    )
    assert "English" in system
    assert f"<material>\n{source}\n</material>" in user
    assert '"selected_index":2' in user
    assert "target concept 'chlorophyll'" in user
    assert 'Set difficulty to exactly easy' in user
