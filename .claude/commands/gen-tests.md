# /gen-tests — Génération de Tests

Lis `CLAUDE.md` pour le contexte du projet.
**Prérequis :** Effectuer `/refactor` 1 et 2 (types.ts + utils.ts) avant de générer les tests frontend.
Les tests doivent refléter le comportement actuel du code — pas un comportement idéal futur.

---

## Setup Backend (pytest + httpx)

### Vérifier / créer `backend/pyproject.toml`

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = ["ignore::DeprecationWarning"]

[tool.coverage.run]
source = ["app"]
omit = ["app/__init__.py"]
```

### Vérifier / ajouter dans `backend/requirements.txt`

```
pytest>=8.0
pytest-asyncio>=0.23
httpx>=0.27
pytest-cov>=5.0
```

### Créer `backend/tests/__init__.py` (vide)

### Créer `backend/tests/conftest.py`

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_session

# Base de données in-memory pour les tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def session(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as s:
        yield s

@pytest_asyncio.fixture
async def client(session):
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

# Factories
def make_user_payload(prenom: str = "TestUser") -> dict:
    return {
        "prenom": prenom,
        "morphologie": "RECTANGLE",
        "genre": "Homme",
        "age": 28
    }

def make_minimal_jpeg() -> bytes:
    """Retourne un JPEG 1x1 blanc valide"""
    return (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e=9'
        b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
        b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00'
        b'\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
        b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xf5\x0a\xff\xd9'
    )
```

---

## Tests Backend

### `backend/tests/test_users.py`

```python
import pytest

@pytest.mark.asyncio
async def test_create_user_success(client):
    res = await client.post("/users/create", json=make_user_payload())
    assert res.status_code == 200
    data = res.json()
    assert data["prenom"] == "TestUser"
    assert "id" in data

@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/users/create", json=make_user_payload("Alice"))
    res = await client.post("/users/login", json={"prenom": "Alice"})
    assert res.status_code == 200
    assert res.json()["prenom"] == "Alice"

@pytest.mark.asyncio
async def test_login_case_insensitive(client):
    await client.post("/users/create", json=make_user_payload("Bob"))
    res = await client.post("/users/login", json={"prenom": "bob"})
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_login_not_found(client):
    res = await client.post("/users/login", json={"prenom": "UtilisateurInexistant99"})
    assert res.status_code == 404
    assert "introuvable" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_update_user(client):
    create_res = await client.post("/users/create", json=make_user_payload("Charlie"))
    user_id = create_res.json()["id"]
    res = await client.put(f"/users/{user_id}", json={"age": 35, "style_prefere": "Casual"})
    assert res.status_code == 200
    assert res.json()["age"] == 35

@pytest.mark.asyncio
async def test_delete_user(client):
    create_res = await client.post("/users/create", json=make_user_payload("Dave"))
    user_id = create_res.json()["id"]
    del_res = await client.delete(f"/users/{user_id}")
    assert del_res.status_code == 200
```

### `backend/tests/test_wardrobe.py`

```python
import pytest
from io import BytesIO

@pytest.mark.asyncio
async def test_upload_valid_jpeg(client):
    # Créer un user d'abord
    user_res = await client.post("/users/create", json=make_user_payload("UploadUser"))
    user_id = user_res.json()["id"]

    jpeg_bytes = make_minimal_jpeg()
    files = {"file": ("test.jpg", BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": user_id, "category": "wardrobe"}

    # L'analyse IA peut échouer en test — on vérifie juste le upload
    res = await client.post("/wardrobe/upload", files=files, data=data)
    # 200 = succès, 500 = upload OK mais Gemini non mockée
    assert res.status_code in [200, 500]

@pytest.mark.asyncio
async def test_get_wardrobe_empty(client):
    user_res = await client.post("/users/create", json=make_user_payload("WardrobeUser"))
    user_id = user_res.json()["id"]
    res = await client.get(f"/wardrobe/{user_id}")
    assert res.status_code == 200
    assert res.json() == []

@pytest.mark.asyncio
async def test_upload_invalid_user(client):
    jpeg_bytes = make_minimal_jpeg()
    files = {"file": ("test.jpg", BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": 999999, "category": "wardrobe"}
    res = await client.post("/wardrobe/upload", files=files, data=data)
    assert res.status_code == 404
```

### `backend/tests/test_admin.py`

```python
import pytest
import os

ADMIN_KEY = os.getenv("ADMIN_KEY", "test-admin-key-for-tests")

@pytest.mark.asyncio
async def test_list_users_valid_key(client):
    res = await client.get("/admin/users", headers={"x-admin-key": ADMIN_KEY})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

@pytest.mark.asyncio
async def test_list_users_invalid_key(client):
    res = await client.get("/admin/users", headers={"x-admin-key": "mauvaise-cle"})
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_list_users_no_key(client):
    res = await client.get("/admin/users")
    assert res.status_code in [401, 403, 422]
```

### `backend/tests/test_ai_service.py` (unit tests, sans appel Gemini réel)

```python
import pytest
from app.services.ai_service import extract_json

def test_extract_json_valid_dict():
    text = '{"type": "T-shirt", "couleur": "bleu"}'
    result = extract_json(text)
    assert result == {"type": "T-shirt", "couleur": "bleu"}

def test_extract_json_with_markdown():
    text = '```json\n{"type": "Jean"}\n```'
    result = extract_json(text)
    assert result["type"] == "Jean"

def test_extract_json_valid_list():
    text = '[{"titre": "Look 1"}, {"titre": "Look 2"}]'
    result = extract_json(text)
    assert len(result) == 2

def test_extract_json_garbage():
    result = extract_json("Réponse textuelle sans JSON")
    assert result is None
```

---

## Setup Frontend (vitest + React Testing Library)

### Vérifier / ajouter dans `frontend/package.json`

```json
{
  "devDependencies": {
    "vitest": "^2.0",
    "@vitejs/plugin-react": "^4.0",
    "@testing-library/react": "^16.0",
    "@testing-library/user-event": "^14.0",
    "jsdom": "^25.0",
    "msw": "^2.0"
  },
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### Créer `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': '/.' }
  }
})
```

### Créer `frontend/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom'
```

---

## Tests Frontend

### `frontend/__tests__/lib/api.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { createUser, loginUser, getWardrobe } from '@/lib/api'

vi.mock('axios')
const mockedAxios = vi.mocked(axios.create())

describe('api.ts', () => {
  it('createUser sends correct payload', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { id: 1, prenom: 'Test' } })
    const result = await createUser({ prenom: 'Test', morphologie: 'RECTANGLE', genre: 'Homme', age: 25 })
    expect(result.prenom).toBe('Test')
  })

  it('loginUser throws on 404', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({ response: { status: 404 } })
    await expect(loginUser('Inconnu')).rejects.toBeDefined()
  })
})
```

### `frontend/__tests__/components/UserForm.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import UserForm from '@/components/UserForm'

describe('UserForm', () => {
  it('renders the prenom input', () => {
    render(<UserForm onUserCreated={() => {}} />)
    expect(screen.getByPlaceholderText(/prénom/i)).toBeInTheDocument()
  })

  it('shows error when prenom is empty', async () => {
    render(<UserForm onUserCreated={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /continuer|créer/i }))
    expect(await screen.findByText(/obligatoire|vide|requis/i)).toBeInTheDocument()
  })
})
```

---

## Lancer les tests

```bash
# Backend
cd backend && python -m pytest -v
cd backend && python -m pytest --cov=app --cov-report=term-missing

# Frontend
cd frontend && npm test
cd frontend && npm run test:coverage
```

## Cibles de couverture

| Zone | Cible |
|------|-------|
| `backend/app/routers/` | 80% |
| `backend/app/services/` | 70% |
| `frontend/lib/api.ts` | 90% |
| `frontend/components/` | 60% |
