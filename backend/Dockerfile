FROM python:3.11-slim

WORKDIR /app

# System deps for psycopg / building wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev git \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip / setuptools / wheel so legacy build backends work.
# Pin setuptools <81 because crewai (and other libs) still import the
# legacy `pkg_resources` module, which setuptools removed in 81.x.
RUN pip install --no-cache-dir --upgrade pip wheel "setuptools<81"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Tables are auto-created by SQLAlchemy on startup (see main.py lifespan).
# Switch to `alembic upgrade head` once an initial migration is generated.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
