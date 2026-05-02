"""add archived to taskstatus enum

Revision ID: 444dbeb1c73a
Revises: a9e6e26c7ef9
Create Date: 2026-05-02 20:30:49.090058
"""

from alembic import op


revision = '444dbeb1c73a'
down_revision = 'a9e6e26c7ef9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'archived'")


def downgrade() -> None:
    # Postgres does not support removing enum values; downgrade is a no-op
    pass
