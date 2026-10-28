---
name: clean-code
description: Practical Clean Code engineering principles for backend (Python) and frontend (TypeScript/React). Focuses on meaningful naming, single-responsibility functions, small cohesive classes, strict typing, error handling, and test-driven verification. Use when writing, refactoring, or reviewing code.
---

# Clean Code Guidelines & Rules

## 1. Meaningful Naming
- Intention-revealing: Variable, function, and class names must answer *why it exists*, *what it does*, and *how it is used*.
- Avoid disinformation: Do not name something `coords_list` if it is a numpy array or tuple.
- Pronounceable and searchable: Never abbreviate domain concepts (use `calculate_parallax` instead of `calc_plx`).
- Classes are nouns (`SpectralTemplateFitter`, `CoordinateService`), functions are verbs (`detect_sources`, `align_images`).

## 2. Functions
- Small and focused: A function should do ONE thing and do it well.
- One level of abstraction: Do not mix high-level business orchestration with low-level byte/array manipulation.
- Arguments: Monadic or dyadic preferred. If >3 arguments, encapsulate into a Pydantic model or dataclass.
- No side effects: Pure calculation functions must not mutate input state or perform hidden I/O.

## 3. Architecture & Hexagonal Boundaries
- Domain entities must not depend on database or external APIs (IRSA, SIMBAD).
- External APIs belong in adapters (`backend/src/adapters/`).
- Business logic belongs in domain services (`backend/src/domain/services/`).

## 4. Error Handling
- Never silence exceptions with bare `except: pass`.
- Custom domain exceptions: Use explicit domain exceptions (`ObservationNotFoundError`, `WCSAlignmentError`).
- Fail-fast and clean rollback.

## 5. Testing
- Every phase must have unit tests covering normal flow, edge cases (e.g. zero sources, NaN pixels), and error cases.
- One assert concept per test.
